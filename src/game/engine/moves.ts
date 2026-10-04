import type { Board, Kind, NewTile, Pos } from "./types.ts";
import type { Rng } from "./rng.ts";
import { adjacent, isPlayable, playablePositions, swapTiles } from "../board/board.ts";
import { findGroups, hasMatchAt } from "./match.ts";

/** A swap is legal when both cells hold tiles and either one is special or the swap makes a match. */
export function isLegalSwap(board: Board, a: Pos, b: Pos): boolean {
  if (!adjacent(a, b) || !isPlayable(board, a[0], a[1]) || !isPlayable(board, b[0], b[1])) return false;
  const ta = board[a[0]][a[1]].tile;
  const tb = board[b[0]][b[1]].tile;
  if (!ta || !tb) return false;
  if (ta.special !== "none" || tb.special !== "none") return true;
  swapTiles(board, a, b);
  const ok = hasMatchAt(board, a[0], a[1]) || hasMatchAt(board, b[0], b[1]);
  swapTiles(board, a, b);
  return ok;
}

/** The first legal move (right and down neighbours), or null. */
export function findMove(board: Board): [Pos, Pos] | null {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && isLegalSwap(board, [r, c], [r, c + 1])) return [[r, c], [r, c + 1]];
      if (r + 1 < rows && isLegalSwap(board, [r, c], [r + 1, c])) return [[r, c], [r + 1, c]];
    }
  return null;
}

export const hasMove = (board: Board) => findMove(board) !== null;

/**
 * Fills every playable cell, row-major, never completing a run of three, and retries
 * until the board has a legal move.
 */
export function fillBoard(board: Board, kinds: readonly Kind[], rng: Rng, nextId: () => number): void {
  const rows = board.length;
  const cols = board[0].length;
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        board[r][c].tile = null;
        if (board[r][c].hole) continue;
        const bad = new Set<Kind>();
        const l1 = board[r][c - 1]?.tile;
        const l2 = board[r][c - 2]?.tile;
        if (l1 && l2 && l1.kind === l2.kind) bad.add(l1.kind);
        const u1 = board[r - 1]?.[c]?.tile;
        const u2 = board[r - 2]?.[c]?.tile;
        if (u1 && u2 && u1.kind === u2.kind) bad.add(u1.kind);
        const options = kinds.filter((k) => !bad.has(k));
        const kind = rng.pick(options.length ? options : kinds);
        board[r][c].tile = { id: nextId(), kind, special: "none" };
      }
    if (hasMove(board)) return;
  }
}

/**
 * Reshuffles the tiles in place until there are no matches and at least one move.
 * Falls back to a fresh fill. Returns every tile's final place for the UI.
 */
export function shuffleBoard(board: Board, kinds: readonly Kind[], rng: Rng, nextId: () => number): NewTile[] {
  const positions = playablePositions(board);
  const tiles = positions.map(([r, c]) => board[r][c].tile!);
  let done = false;
  for (let attempt = 0; attempt < 60 && !done; attempt++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    positions.forEach(([r, c], i) => (board[r][c].tile = tiles[i]));
    done = findGroups(board).length === 0 && hasMove(board);
  }
  if (!done) fillBoard(board, kinds, rng, nextId);
  return positions.map(([r, c]) => {
    const t = board[r][c].tile!;
    return { id: t.id, kind: t.kind, special: t.special, r, c, fromR: r };
  });
}
