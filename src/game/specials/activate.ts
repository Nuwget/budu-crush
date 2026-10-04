import type { Board, Kind, Pos, Special } from "../engine/types.ts";

/** Cells hit by one special at (r, c). `target` is the kind a colour orb removes. */
export function blastArea(board: Board, r: number, c: number, special: Special, target: Kind): Pos[] {
  const rows = board.length;
  const cols = board[0].length;
  const out: Pos[] = [];
  const add = (rr: number, cc: number) => {
    if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && !board[rr][cc].hole && board[rr][cc].tile) out.push([rr, cc]);
  };
  switch (special) {
    case "lineH":
      for (let cc = 0; cc < cols; cc++) add(r, cc);
      break;
    case "lineV":
      for (let rr = 0; rr < rows; rr++) add(rr, c);
      break;
    case "bomb":
      for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) add(rr, cc);
      break;
    case "color":
      for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) if (board[rr][cc].tile?.kind === target) add(rr, cc);
      add(r, c);
      break;
    default:
      add(r, c);
  }
  return out;
}

/** The kind with the most tiles on the board (what a colour orb hits when set off by a chain). */
export function mostCommonKind(board: Board): Kind {
  const count = new Map<Kind, number>();
  for (const row of board)
    for (const cell of row) {
      const k = cell.tile?.kind;
      if (k !== undefined && k >= 0) count.set(k, (count.get(k) ?? 0) + 1);
    }
  let best: Kind = 0;
  let bestN = -1;
  for (const [k, n] of count)
    if (n > bestN || (n === bestN && k < best)) {
      best = k;
      bestN = n;
    }
  return best;
}
