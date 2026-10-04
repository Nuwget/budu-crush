import type { Board, FallMove, Kind, NewTile } from "../engine/types.ts";
import type { Rng } from "../engine/rng.ts";

/**
 * Drops tiles down inside each column segment (a run of playable cells between holes)
 * and returns the moves. Tiles never cross a hole.
 */
export function applyGravity(board: Board): FallMove[] {
  const moves: FallMove[] = [];
  const rows = board.length;
  const cols = board[0].length;
  for (let c = 0; c < cols; c++) {
    let r = rows - 1;
    while (r >= 0) {
      if (board[r][c].hole) {
        r--;
        continue;
      }
      // segment spans [top..r]
      let top = r;
      while (top - 1 >= 0 && !board[top - 1][c].hole) top--;
      let write = r;
      for (let read = r; read >= top; read--) {
        const tile = board[read][c].tile;
        if (!tile) continue;
        if (write !== read) {
          board[write][c].tile = tile;
          board[read][c].tile = null;
          moves.push({ id: tile.id, r: write, c });
        }
        write--;
      }
      r = top - 1;
    }
  }
  return moves;
}

/** Fills every empty playable cell with a new random tile, dropping in from above its segment. */
export function refill(board: Board, kinds: readonly Kind[], rng: Rng, nextId: () => number): NewTile[] {
  const out: NewTile[] = [];
  const rows = board.length;
  const cols = board[0].length;
  for (let c = 0; c < cols; c++) {
    let r = rows - 1;
    while (r >= 0) {
      if (board[r][c].hole) {
        r--;
        continue;
      }
      let top = r;
      while (top - 1 >= 0 && !board[top - 1][c].hole) top--;
      let empty = 0;
      for (let k = top; k <= r; k++) if (!board[k][c].tile) empty++;
      let drop = empty;
      for (let k = top; k <= r; k++) {
        if (board[k][c].tile) continue;
        const tile = { id: nextId(), kind: rng.pick(kinds), special: "none" as const };
        board[k][c].tile = tile;
        // stack the newcomers above the segment in the order they will land
        out.push({ ...tile, r: k, c, fromR: top - drop });
        drop--;
      }
      r = top - 1;
    }
  }
  return out;
}
