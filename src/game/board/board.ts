import type { Board, Cell, Pos, Tile } from "../engine/types.ts";

export function parseLayout(layout: string[]): Board {
  return layout.map((row) =>
    Array.from(row, (ch): Cell => ({
      tile: null,
      hole: ch === "#",
      ice: ch === "i" ? 1 : ch === "I" ? 2 : 0,
    })),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((c) => ({ tile: c.tile ? { ...c.tile } : null, hole: c.hole, ice: c.ice })));
}

export const inBounds = (board: Board, r: number, c: number) => r >= 0 && c >= 0 && r < board.length && c < board[0].length;

export function tileAt(board: Board, r: number, c: number): Tile | null {
  return inBounds(board, r, c) ? board[r][c].tile : null;
}

export const isPlayable = (board: Board, r: number, c: number) => inBounds(board, r, c) && !board[r][c].hole;

export const adjacent = (a: Pos, b: Pos) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

export function swapTiles(board: Board, a: Pos, b: Pos) {
  const t = board[a[0]][a[1]].tile;
  board[a[0]][a[1]].tile = board[b[0]][b[1]].tile;
  board[b[0]][b[1]].tile = t;
}

export function countIce(board: Board): number {
  let n = 0;
  for (const row of board) for (const c of row) n += c.ice;
  return n;
}

/** All playable positions, row-major. */
export function playablePositions(board: Board): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < board.length; r++) for (let c = 0; c < board[0].length; c++) if (!board[r][c].hole) out.push([r, c]);
  return out;
}
