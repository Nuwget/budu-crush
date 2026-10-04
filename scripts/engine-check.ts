// Run with: node scripts/engine-check.ts   (Node 24 strips the types natively)
import assert from "node:assert/strict";
import type { Board, GameState, LevelDef, Pos, Step } from "../src/game/engine/types.ts";
import { parseLayout } from "../src/game/board/board.ts";
import { findGroups } from "../src/game/engine/match.ts";
import { createState } from "../src/game/engine/init.ts";
import { resolveSwap } from "../src/game/engine/resolve.ts";
import { findMove, hasMove, shuffleBoard } from "../src/game/engine/moves.ts";
import { Rng } from "../src/game/engine/rng.ts";
import { applyGravity } from "../src/game/board/gravity.ts";
import { getLevel, TOTAL_LEVELS } from "../src/game/levels/index.ts";
import { validateLevel } from "../src/game/levels/validate.ts";
import { starsFor, waveScore } from "../src/game/scoring/score.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("ok   ", name);
  } catch (e) {
    console.error("FAIL ", name);
    throw e;
  }
}

/** Digits are kinds, '.' is an empty cell, '#' a hole. Lowercase h/v/b/c mark specials of kind 0. */
function board(rows: string[]): Board {
  const b = parseLayout(rows.map((r) => r.replace(/[^#]/g, ".")));
  let id = 1;
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === "#" || ch === ".") return;
      const special = ch === "h" ? "lineH" : ch === "v" ? "lineV" : ch === "b" ? "bomb" : ch === "c" ? "color" : "none";
      const kind = special === "none" ? Number(ch) : special === "color" ? -1 : 0;
      b[r][c].tile = { id: id++, kind, special };
    }),
  );
  return b;
}

const level = (over: Partial<LevelDef> = {}): LevelDef => ({
  id: 99,
  layout: Array(6).fill("......"),
  kinds: [0, 1, 2, 3, 4],
  seed: 1,
  moves: 10,
  objective: { type: "score", target: 100000 },
  stars: [1, 2, 3],
  specials: true,
  ...over,
});

function stateFrom(rows: string[], over: Partial<LevelDef> = {}): GameState {
  const b = board(rows);
  const l = level({ layout: rows.map((r) => r.replace(/[^#]/g, ".")), ...over });
  return { rows: rows.length, cols: rows[0].length, board: b, level: l, rng: 7, nextId: 1000, moves: l.moves, score: 0, collected: 0, iceLeft: 0, status: "playing" };
}

const kinds = (steps: Step[], t: Step["t"]) => steps.filter((s) => s.t === t);
const noMatchesLeft = (b: Board) => findGroups(b).length === 0;
const full = (b: Board) => b.every((row) => row.every((c) => c.hole || c.tile));

test("detects a run of 3, 4 and 5", () => {
  assert.equal(findGroups(board(["000...", "......", "......"])).length, 1);
  assert.equal(findGroups(board(["0000..", "......"]))[0].creates, "lineV");
  assert.equal(findGroups(board(["00000.", "......"]))[0].creates, "color");
  assert.equal(findGroups(board(["0", "0", "0", "0"]))[0].creates, "lineH");
});

test("L and T shapes become one group that makes a bomb", () => {
  const l = findGroups(board(["000", "0..", "0.."]));
  assert.equal(l.length, 1);
  assert.equal(l[0].cells.length, 5);
  assert.equal(l[0].creates, "bomb");
  const t = findGroups(board(["000", ".0.", ".0."]));
  assert.equal(t[0].creates, "bomb");
});

test("two separate runs stay two groups; a colour orb never matches", () => {
  assert.equal(findGroups(board(["000.111"])).length, 2);
  assert.equal(findGroups(board(["ccc"])).length, 0);
});

test("initial boards: no matches, a legal move, 500 seeds", () => {
  for (let seed = 1; seed <= 500; seed++) {
    const s = createState(level({ seed, layout: Array(8).fill("........"), kinds: [0, 1, 2, 3] }));
    assert.ok(noMatchesLeft(s.board), `seed ${seed} has a match`);
    assert.ok(hasMove(s.board), `seed ${seed} has no move`);
    assert.ok(full(s.board));
  }
});

test("same seed and same moves give identical steps", () => {
  const play = () => {
    let s = createState(getLevel(2));
    const out: Step[] = [];
    for (let i = 0; i < 8; i++) {
      const m = findMove(s.board);
      if (!m) break;
      const r = resolveSwap(s, m[0], m[1]);
      out.push(...r.steps);
      s = r.state;
    }
    return JSON.stringify(out);
  };
  assert.equal(play(), play());
});

test("an illegal swap changes nothing and costs no move", () => {
  const s = createState(getLevel(2));
  const before = JSON.stringify(s.board);
  // find an adjacent pair that is NOT legal
  let done = false;
  for (let r = 0; r < s.rows && !done; r++)
    for (let c = 0; c + 1 < s.cols && !done; c++) {
      const a: Pos = [r, c];
      const b: Pos = [r, c + 1];
      const res = resolveSwap(s, a, b);
      if (res.steps[0]?.t === "invalid") {
        assert.equal(res.state.moves, s.moves);
        assert.equal(JSON.stringify(res.state.board), before);
        assert.equal(res.steps.length, 1);
        done = true;
      }
    }
  assert.ok(done);
});

test("the input state is never mutated", () => {
  const s = createState(getLevel(1));
  const snap = JSON.stringify(s);
  const m = findMove(s.board)!;
  resolveSwap(s, m[0], m[1]);
  assert.equal(JSON.stringify(s), snap);
});

test("a simple match clears, scores and refills", () => {
  const t = stateFrom(["001234", "123401", "340123", "401234", "234012", "012340"]);
  t.board[1][2].tile!.kind = 0;
  const res = resolveSwap(t, [0, 2], [1, 2]);
  assert.equal(res.steps[0].t, "swap");
  assert.ok(kinds(res.steps, "clear").length >= 1);
  assert.ok(res.state.score >= 120);
  assert.equal(res.state.moves, t.moves - 1);
  assert.ok(full(res.state.board));
  assert.ok(noMatchesLeft(res.state.board));
  assert.ok(kinds(res.steps, "refill").length >= 1);
});

test("4 in a row creates a line clearer on the swapped cell", () => {
  // 0 0 . 0 with a 0 below the gap: swapping fills it
  const s = stateFrom(["001034", "123401", "340123", "401234", "234012", "012340"]);
  s.board[1][2].tile!.kind = 0;
  const res = resolveSwap(s, [0, 2], [1, 2]);
  assert.equal(res.steps[0].t, "swap");
  const spawn = kinds(res.steps, "spawn")[0];
  assert.ok(spawn && spawn.t === "spawn" && spawn.tile.special === "lineV");
  assert.deepEqual([spawn.tile.r, spawn.tile.c].length, 2);
});

test("5 in a row creates a colour orb", () => {
  const s = stateFrom(["00.001", "123401", "340123", "401234", "234012", "012340"]);
  s.board[0][2].tile = { id: 500, kind: 4, special: "none" };
  s.board[1][2].tile!.kind = 0;
  const res = resolveSwap(s, [0, 2], [1, 2]);
  const spawn = kinds(res.steps, "spawn")[0];
  assert.ok(spawn && spawn.t === "spawn" && spawn.tile.special === "color");
  assert.equal(spawn.tile.kind, -1);
});

test("a line clearer swapped with a normal tile clears its whole row", () => {
  const s = stateFrom(["123412", "h23401", "340123", "401234", "234012", "012340"]);
  const res = resolveSwap(s, [1, 0], [1, 1]);
  const clear = kinds(res.steps, "clear")[0];
  assert.ok(clear && clear.t === "clear");
  assert.ok(clear.tiles.filter((t) => t.r === 1).length === 6, "row 1 fully cleared");
  assert.ok(kinds(res.steps, "activate").length >= 1);
});

test("bomb + bomb clears a 5x5", () => {
  const s = stateFrom(["123412", "234012", "34bb23", "401234", "234012", "012340"]);
  const res = resolveSwap(s, [2, 2], [2, 3]);
  const clear = kinds(res.steps, "clear")[0];
  assert.ok(clear && clear.t === "clear" && clear.tiles.length >= 20, `got ${clear && clear.t === "clear" ? clear.tiles.length : 0}`);
});

test("colour orb + colour orb clears the whole board", () => {
  const s = stateFrom(["123412", "234012", "34cc23", "401234", "234012", "012340"]);
  const res = resolveSwap(s, [2, 2], [2, 3]);
  const clear = kinds(res.steps, "clear")[0];
  assert.ok(clear && clear.t === "clear" && clear.tiles.length === 36);
});

test("colour orb + normal tile clears every tile of that kind", () => {
  const s = stateFrom(["123412", "234012", "34c123", "401234", "234012", "012340"]);
  const target = s.board[2][3].tile!.kind;
  const count = s.board.flat().filter((c) => c.tile?.kind === target).length;
  const res = resolveSwap(s, [2, 2], [2, 3]);
  const clear = kinds(res.steps, "clear")[0];
  assert.ok(clear && clear.t === "clear");
  assert.ok(clear.tiles.filter((t) => t.kind === target).length === count);
});

test("colour orb + bomb turns that kind into bombs (convert step)", () => {
  const s = stateFrom(["123412", "234012", "34cb23", "401234", "234012", "012340"]);
  const res = resolveSwap(s, [2, 2], [2, 3]);
  assert.ok(kinds(res.steps, "convert").length === 1);
});

test("chain reactions terminate when specials hit each other", () => {
  const s = stateFrom(["h12341", "23401h", "34012v", "401234", "23b012", "012340"]);
  const res = resolveSwap(s, [0, 0], [0, 1]);
  assert.ok(res.steps.length < 400);
  assert.ok(full(res.state.board) && noMatchesLeft(res.state.board));
});

test("gravity never moves a tile across a hole", () => {
  const b = board(["0#", "1.", "2."]);
  b[2][1].tile = null;
  const moves = applyGravity(b);
  assert.ok(moves.every((m) => m.c === 1));
  assert.equal(b[0][0].tile!.kind, 0);
});

test("ice takes damage when its tile clears and the ice objective wins", () => {
  const rows = ["001034", "123401", "340123", "401234", "234012", "012340"];
  const s = stateFrom(rows, { layout: ["..i...", "......", "......", "......", "......", "......"], objective: { type: "ice" } });
  s.board[0][2].ice = 1;
  s.iceLeft = 1;
  s.board[1][2].tile!.kind = 0;
  const res = resolveSwap(s, [0, 2], [1, 2]);
  assert.equal(res.state.iceLeft, 0);
  assert.equal(res.state.status, "won");
  assert.equal(kinds(res.steps, "end").length, 1);
});

test("running out of moves loses", () => {
  const rows = ["001034", "123401", "340123", "401234", "234012", "012340"];
  const s = stateFrom(rows, { moves: 1 });
  s.board[1][2].tile!.kind = 0;
  const res = resolveSwap(s, [0, 2], [1, 2]);
  assert.equal(res.state.status, "lost");
});

test("shuffle always leaves a playable board", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = createState(level({ seed, layout: Array(8).fill("........"), kinds: [0, 1, 2, 3, 4] }));
    const rng = new Rng(seed);
    let id = 5000;
    shuffleBoard(s.board, s.level.kinds, rng, () => id++);
    assert.ok(noMatchesLeft(s.board) && hasMove(s.board) && full(s.board));
  }
});

test("scoring: 120 / 240 / 360 for three tiles at combo 1 / 2 / 3", () => {
  assert.equal(waveScore(3, 1, 0), 120);
  assert.equal(waveScore(3, 2, 0), 240);
  assert.equal(waveScore(3, 3, 0), 360);
  assert.equal(starsFor(0, [10, 20, 30]), 0);
  assert.equal(starsFor(25, [10, 20, 30]), 2);
});

test("all levels validate and start with a legal move", () => {
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const l = getLevel(n);
    assert.deepEqual(validateLevel(l), [], `level ${n}`);
    const s = createState(l);
    assert.ok(hasMove(s.board) && noMatchesLeft(s.board), `level ${n} start`);
  }
});

test("fuzz: invariants hold after every resolved move", () => {
  for (let n = 1; n <= 12; n++) {
    let s = createState(getLevel(n));
    const rng = new Rng(n);
    const ids = new Set<number>();
    for (let i = 0; i < 80 && s.status === "playing"; i++) {
      const moves: [Pos, Pos][] = [];
      for (let r = 0; r < s.rows; r++)
        for (let c = 0; c < s.cols; c++) {
          moves.push([[r, c], [r, c + 1]]);
          moves.push([[r, c], [r + 1, c]]);
        }
      const [a, b] = rng.pick(moves);
      const res = resolveSwap(s, a, b);
      s = res.state;
      assert.ok(full(s.board), `level ${n} hole in board`);
      if (s.status === "playing") assert.ok(noMatchesLeft(s.board), `level ${n} match left`);
      ids.clear();
      for (const cell of s.board.flat()) if (cell.tile) {
        assert.ok(!ids.has(cell.tile.id), "duplicate tile id");
        ids.add(cell.tile.id);
      }
      if (s.status === "playing") assert.ok(hasMove(s.board), `level ${n} stuck`);
    }
  }
});

console.log(`\n${passed} tests passed`);
