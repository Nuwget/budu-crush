import { TOTAL_LEVELS } from "@/game/levels";

export const SPACING = 116;
export const PAD_TOP = 130;
export const PAD_BOTTOM = 150;
export const MAP_HEIGHT = PAD_TOP + PAD_BOTTOM + (TOTAL_LEVELS - 1) * SPACING;

/** Which charm art each node wears: moon, star, window-ish crystal, cloud... in a gentle loop. */
export const NODE_KINDS = [1, 0, 4, 2, 3, 5];

export interface NodePos {
  level: number;
  /** percent of the map width */
  x: number;
  /** px from the top of the map */
  y: number;
}

/** Level 1 at the bottom, climbing a winding path toward the top of the night sky. */
export function nodePositions(): NodePos[] {
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => ({
    level: i + 1,
    x: 50 + Math.sin(i * 0.95) * 27,
    y: MAP_HEIGHT - PAD_BOTTOM - i * SPACING,
  }));
}

/** An SVG path (x in percent units, y in px) joining the nodes from `from` to `to` (1-based). */
export function pathBetween(nodes: NodePos[], from: number, to: number): string {
  const pts = nodes.slice(from - 1, to);
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  return d;
}
