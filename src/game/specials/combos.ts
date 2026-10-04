import type { Board, Kind, Pos, Special, Tile } from "../engine/types.ts";
import { blastArea } from "./activate.ts";

export interface ComboPlan {
  /** Cells cleared by the combo itself (before chain reactions). */
  cells: Pos[];
  /** Colour orb combos first turn every tile of a kind into a special. */
  convert?: { kind: Kind; special: Special };
  /** The two swapped specials are consumed by the combo, so they must not fire again. */
  consumed: Pos[];
}

const isLine = (s: Special) => s === "lineH" || s === "lineV";

/**
 * What happens when the player swaps two special tiles (or a colour orb with a normal tile).
 * `a` and `b` are the tiles' positions after the swap; the combo is centred on `b`.
 */
export function planCombo(board: Board, a: Pos, b: Pos, pickLine: () => Special): ComboPlan | null {
  const ta = board[a[0]][a[1]].tile as Tile;
  const tb = board[b[0]][b[1]].tile as Tile;
  const consumed: Pos[] = [a, b];
  const rows = board.length;
  const cols = board[0].length;
  const [r, c] = b;
  const cells = new Map<number, Pos>();
  const add = (p: Pos) => cells.set(p[0] * cols + p[1], p);
  const addAll = (list: Pos[]) => list.forEach(add);
  const hit = (rr: number, cc: number) => {
    if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && !board[rr][cc].hole && board[rr][cc].tile) add([rr, cc]);
  };

  const sa = ta.special;
  const sb = tb.special;

  if (sa === "color" && sb === "color") {
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) hit(rr, cc);
    return { cells: [...cells.values()], consumed };
  }
  if (sa === "color" || sb === "color") {
    const partner = sa === "color" ? tb : ta;
    const orb = sa === "color" ? a : b;
    if (partner.special === "none") {
      addAll(blastArea(board, orb[0], orb[1], "color", partner.kind));
      return { cells: [...cells.values()], consumed };
    }
    // orb + line / bomb: every tile of the partner's kind becomes that special, then all fire
    const special: Special = isLine(partner.special) ? pickLine() : "bomb";
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) if (board[rr][cc].tile?.kind === partner.kind) hit(rr, cc);
    hit(a[0], a[1]);
    hit(b[0], b[1]);
    return { cells: [...cells.values()], convert: { kind: partner.kind, special }, consumed: [orb] };
  }
  if (isLine(sa) && isLine(sb)) {
    for (let cc = 0; cc < cols; cc++) hit(r, cc);
    for (let rr = 0; rr < rows; rr++) hit(rr, c);
    return { cells: [...cells.values()], consumed };
  }
  if ((isLine(sa) && sb === "bomb") || (sa === "bomb" && isLine(sb))) {
    for (let d = -1; d <= 1; d++) {
      for (let cc = 0; cc < cols; cc++) hit(r + d, cc);
      for (let rr = 0; rr < rows; rr++) hit(rr, c + d);
    }
    return { cells: [...cells.values()], consumed };
  }
  if (sa === "bomb" && sb === "bomb") {
    for (let rr = r - 2; rr <= r + 2; rr++) for (let cc = c - 2; cc <= c + 2; cc++) hit(rr, cc);
    return { cells: [...cells.values()], consumed };
  }
  return null;
}
