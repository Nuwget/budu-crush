import type { ClearedTile, GameState, NewTile, Pos, Resolution, Special, Step } from "./types.ts";
import { COLOR_KIND } from "./types.ts";
import { Rng } from "./rng.ts";
import { adjacent, cloneBoard, isPlayable, swapTiles } from "../board/board.ts";
import { applyGravity, refill } from "../board/gravity.ts";
import { findGroups, hasMatchAt } from "./match.ts";
import type { Group } from "./match.ts";
import { findMove, shuffleBoard } from "./moves.ts";
import { blastArea, mostCommonKind } from "../specials/activate.ts";
import { planCombo } from "../specials/combos.ts";
import { waveScore } from "../scoring/score.ts";

export function cloneState(s: GameState): GameState {
  return { ...s, board: cloneBoard(s.board) };
}

/**
 * Collect and ice levels end the moment the goal is met. Score levels play every move
 * out, so extra moves keep paying off in stars.
 */
function objectiveMet(s: GameState): boolean {
  const o = s.level.objective;
  if (o.type === "score") return s.moves <= 0 && s.score >= o.target;
  if (o.type === "collect") return s.collected >= o.count;
  return s.iceLeft <= 0;
}

/** Where a new special appears: on a swapped cell if the group has one, else nearest the centre. */
function spawnPos(group: Group, prefer: readonly Pos[]): Pos {
  for (const p of prefer) if (group.cells.some((c) => c[0] === p[0] && c[1] === p[1])) return p;
  const cr = group.cells.reduce((n, c) => n + c[0], 0) / group.cells.length;
  const cc = group.cells.reduce((n, c) => n + c[1], 0) / group.cells.length;
  let best = group.cells[0];
  let bestD = Infinity;
  for (const p of group.cells) {
    const d = (p[0] - cr) ** 2 + (p[1] - cc) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/**
 * Plays one swap to the end (matches, special tiles, cascades, refills) and returns the
 * ordered steps plus the resulting state. The input state is never mutated.
 */
export function resolveSwap(input: GameState, a: Pos, b: Pos): Resolution {
  const s = cloneState(input);
  const steps: Step[] = [];
  const { board } = s;
  if (s.status !== "playing" || s.moves <= 0) return { steps, state: s };
  if (!adjacent(a, b) || !isPlayable(board, a[0], a[1]) || !isPlayable(board, b[0], b[1])) return { steps, state: s };
  const first = board[a[0]][a[1]].tile;
  const second = board[b[0]][b[1]].tile;
  if (!first || !second) return { steps, state: s };

  const rng = new Rng(s.rng);
  const nextId = () => s.nextId++;
  const finish = (): Resolution => {
    s.rng = rng.state;
    return { steps, state: s };
  };

  swapTiles(board, a, b);
  const viaSpecial = first.special !== "none" || second.special !== "none";
  if (!viaSpecial && !hasMatchAt(board, a[0], a[1]) && !hasMatchAt(board, b[0], b[1])) {
    swapTiles(board, a, b);
    steps.push({ t: "invalid", a, b });
    return finish();
  }

  s.moves--;
  steps.push({ t: "swap", a, b, moves: s.moves });

  const activated = new Set<number>();
  let pending: Pos[] | null = null;
  const prefer: Pos[] = [a, b];

  if (viaSpecial) {
    const plan = planCombo(board, a, b, () => (rng.float() < 0.5 ? "lineH" : "lineV"));
    if (plan) {
      for (const p of plan.consumed) activated.add(board[p[0]][p[1]].tile!.id);
      if (plan.convert) {
        const converted: { id: number; r: number; c: number; special: Special }[] = [];
        for (const [r, c] of plan.cells) {
          const t = board[r][c].tile;
          if (t && t.kind === plan.convert.kind) {
            t.special = plan.convert.special;
            converted.push({ id: t.id, r, c, special: t.special });
          }
        }
        steps.push({ t: "convert", tiles: converted });
      }
      pending = plan.cells;
      const centre = board[b[0]][b[1]].tile;
      steps.push({ t: "activate", r: b[0], c: b[1], special: centre?.special ?? "none", cells: plan.cells });
    } else {
      // a line clearer or bomb swapped with an ordinary tile fires on the spot
      const pos = first.special !== "none" ? b : a;
      const tile = board[pos[0]][pos[1]].tile!;
      const area = blastArea(board, pos[0], pos[1], tile.special, tile.kind);
      activated.add(tile.id);
      pending = area;
      steps.push({ t: "activate", r: pos[0], c: pos[1], special: tile.special, cells: area });
    }
  }

  runCascade(s, steps, rng, nextId, pending, activated, prefer);

  if (objectiveMet(s)) s.status = "won";
  else if (s.moves <= 0) s.status = "lost";
  if (s.status !== "playing") {
    steps.push({ t: "end", status: s.status });
  } else if (!findMove(board)) {
    steps.push({ t: "shuffle", tiles: shuffleBoard(board, s.level.kinds, rng, nextId) });
  }
  return finish();
}

function runCascade(
  s: GameState,
  steps: Step[],
  rng: Rng,
  nextId: () => number,
  initial: Pos[] | null,
  activated: Set<number>,
  prefer: Pos[],
) {
  const { board, level } = s;
  const cols = board[0].length;
  let pending = initial;
  let combo = 0;
  let preferNow: Pos[] = prefer;

  for (let guard = 0; guard < 200; guard++) {
    const groups = findGroups(board);
    if (!pending && groups.length === 0) break;
    combo++;

    const clearSet = new Map<number, Pos>();
    const addCell = (p: Pos) => {
      if (board[p[0]][p[1]].tile) clearSet.set(p[0] * cols + p[1], p);
    };
    const creations: { pos: Pos; kind: number; special: Special }[] = [];
    for (const g of groups) {
      g.cells.forEach(addCell);
      if (level.specials && g.creates !== "none") {
        creations.push({ pos: spawnPos(g, preferNow), kind: g.creates === "color" ? COLOR_KIND : g.kind, special: g.creates });
      }
    }
    if (pending) pending.forEach(addCell);
    pending = null;
    preferNow = [];

    // chain reaction: every special that gets caught fires once
    const queue = [...clearSet.values()];
    let fired = 0;
    for (let qi = 0; qi < queue.length; qi++) {
      const [r, c] = queue[qi];
      const t = board[r][c].tile;
      if (!t || t.special === "none" || activated.has(t.id)) continue;
      activated.add(t.id);
      fired++;
      const area = blastArea(board, r, c, t.special, t.special === "color" ? mostCommonKind(board) : t.kind);
      steps.push({ t: "activate", r, c, special: t.special, cells: area });
      for (const p of area)
        if (!clearSet.has(p[0] * cols + p[1])) {
          clearSet.set(p[0] * cols + p[1], p);
          queue.push(p);
        }
    }

    const cleared: ClearedTile[] = [];
    const damaged: { r: number; c: number; ice: number }[] = [];
    const obj = level.objective;
    for (const [r, c] of clearSet.values()) {
      const cell = board[r][c];
      const t = cell.tile!;
      cleared.push({ id: t.id, r, c, kind: t.kind, special: t.special });
      cell.tile = null;
      if (obj.type === "collect" && t.kind === obj.kind) s.collected++;
      if (cell.ice > 0) {
        cell.ice--;
        s.iceLeft--;
        damaged.push({ r, c, ice: cell.ice });
      }
    }
    steps.push({ t: "clear", tiles: cleared, combo });
    for (const d of damaged) steps.push({ t: "damage", ...d });

    const delta = waveScore(cleared.length, combo, fired);
    s.score += delta;
    const cr = Math.round(cleared.reduce((n, t) => n + t.r, 0) / cleared.length);
    const cc = Math.round(cleared.reduce((n, t) => n + t.c, 0) / cleared.length);
    steps.push({ t: "score", delta, at: [cr, cc], combo, score: s.score, collected: s.collected, iceLeft: s.iceLeft });

    for (const cre of creations) {
      const [r, c] = cre.pos;
      if (board[r][c].tile) continue;
      const tile = { id: nextId(), kind: cre.kind, special: cre.special };
      board[r][c].tile = tile;
      const spawned: NewTile = { ...tile, r, c, fromR: r };
      steps.push({ t: "spawn", tile: spawned });
    }

    const moves = applyGravity(board);
    if (moves.length) steps.push({ t: "fall", moves });
    const fresh = refill(board, level.kinds as number[], rng, nextId);
    if (fresh.length) steps.push({ t: "refill", tiles: fresh });
  }
}
