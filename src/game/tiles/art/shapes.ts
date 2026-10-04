// Procedural 16x16 pixel art. Each charm is a silhouette function; the grid is derived
// from it (outline, light from the upper left, a glint), so every piece has a distinct
// outline and the six read apart even without colour.

export const SIZE = 16;
export type Grid = string[];

type Inside = (u: number, v: number) => boolean;

const circle = (cx: number, cy: number, r: number): Inside => (u, v) => Math.hypot(u - cx, v - cy) <= r;
const union =
  (...fns: Inside[]): Inside =>
  (u, v) =>
    fns.some((f) => f(u, v));

function polygon(points: [number, number][]): Inside {
  return (u, v) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

function starPoints(cx: number, cy: number, R: number, r: number): [number, number][] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  });
}

export const SHAPES: Record<string, { inside: Inside; cx: number; cy: number; R: number; facets?: boolean; accent?: Inside }> = {
  moon: { inside: (u, v) => circle(8, 8, 7.5)(u, v) && !circle(11.9, 6.1, 5.7)(u, v), cx: 7, cy: 8, R: 7 },
  star: { inside: polygon(starPoints(8, 8.7, 8.2, 3.7)), cx: 8, cy: 8.6, R: 8 },
  cloud: {
    inside: union(circle(4.8, 10.2, 3.5), circle(8.2, 7.4, 4.4), circle(11.7, 9.4, 3.8), (u, v) => u >= 4 && u <= 13.4 && v >= 9.4 && v <= 13.6),
    cx: 8,
    cy: 8.6,
    R: 7.5,
  },
  heart: {
    inside: (u, v) => {
      const x = (u - 8) / 6.4;
      const y = -(v - 8.9) / 6.2;
      return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
    },
    cx: 8,
    cy: 8.6,
    R: 7.5,
  },
  crystal: {
    inside: polygon([
      [4.6, 1.2],
      [11.4, 1.2],
      [15.2, 6],
      [8, 15.7],
      [0.8, 6],
    ]),
    cx: 8,
    cy: 8,
    R: 8,
    facets: true,
  },
  flower: {
    inside: union(...Array.from({ length: 5 }, (_, k) => circle(8 + Math.cos(((k * 72 - 90) * Math.PI) / 180) * 4.5, 8 + Math.sin(((k * 72 - 90) * Math.PI) / 180) * 4.5, 3.4)), circle(8, 8, 3)),
    cx: 8,
    cy: 8,
    R: 8,
    accent: circle(8, 8, 2.1),
  },
};

export function buildGrid(name: keyof typeof SHAPES): Grid {
  const sh = SHAPES[name];
  const mask: boolean[][] = [];
  for (let y = 0; y < SIZE; y++) {
    mask.push([]);
    for (let x = 0; x < SIZE; x++) mask[y].push(sh.inside(x + 0.5, y + 0.5));
  }
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && mask[y][x];
  const lit = (x: number, y: number) => ((sh.cx - (x + 0.5)) * 0.55 + (sh.cy - (y + 0.5)) * 0.83) / sh.R;

  let glint: [number, number] | null = null;
  let best = -9;
  const grid: string[][] = [];
  for (let y = 0; y < SIZE; y++) {
    grid.push([]);
    for (let x = 0; x < SIZE; x++) {
      if (!mask[y][x]) {
        grid[y].push(".");
        continue;
      }
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      if (edge) {
        grid[y].push("o");
        continue;
      }
      let key: string;
      if (sh.facets) key = y === 6 ? "h" : y < 6 ? (x + 0.5 < 8 ? "h" : "b") : x + 0.5 < 8 ? "b" : "s";
      else {
        const l = lit(x, y);
        key = l > 0.42 ? "h" : l < -0.3 ? "s" : "b";
      }
      if (sh.accent?.(x + 0.5, y + 0.5)) key = "a";
      grid[y].push(key);
      const l = lit(x, y);
      if (l > best && !sh.accent?.(x + 0.5, y + 0.5)) {
        best = l;
        glint = [x, y];
      }
    }
  }
  if (glint) {
    const [gx, gy] = glint;
    if (grid[gy][gx] !== "o") grid[gy][gx] = "w";
    if (gy + 1 < SIZE && grid[gy + 1][gx] !== "o" && grid[gy + 1][gx] !== ".") grid[gy + 1][gx] = "w";
  }
  return grid.map((r) => r.join(""));
}

/** The colour orb: a ball with a rainbow band, its own silhouette (a plain disc with a ring). */
export function buildOrb(): Grid {
  const out: string[] = [];
  for (let y = 0; y < SIZE; y++) {
    let row = "";
    for (let x = 0; x < SIZE; x++) {
      const u = x + 0.5 - 8;
      const v = y + 0.5 - 8;
      const d = Math.hypot(u, v);
      if (d > 7.6) row += ".";
      else if (d > 6.6) row += "o";
      else if (d > 5.2 && d <= 6.6) {
        const a = (Math.atan2(v, u) + Math.PI) / (2 * Math.PI);
        row += "rygcpr"[Math.floor(a * 6) % 6];
      } else {
        const l = (-u * 0.55 - v * 0.83) / 5;
        row += l > 0.5 ? "w" : l > 0.1 ? "h" : l < -0.35 ? "s" : "b";
      }
    }
    out.push(row);
  }
  return out;
}

/** Overlays are drawn on top of a charm to mark its special power. */
export function buildOverlay(kind: "lineH" | "lineV" | "bomb"): Grid {
  const g: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill("."));
  const set = (x: number, y: number, k: string) => {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) g[y][x] = k;
  };
  if (kind === "lineH" || kind === "lineV") {
    const p = (i: number, j: number, k: string) => (kind === "lineH" ? set(i, j, k) : set(j, i, k));
    for (let i = 3; i <= 12; i++) {
      p(i, 7, "w");
      p(i, 8, "w");
      p(i, 6, "o");
      p(i, 9, "o");
    }
    // arrow heads at both ends
    for (const [i, j, k] of [
      [0, 7.5, "a"], [1, 6, "a"], [1, 7, "a"], [1, 8, "a"], [1, 9, "a"], [2, 5, "a"], [2, 6, "a"], [2, 9, "a"], [2, 10, "a"],
      [15, 7.5, "a"], [14, 6, "a"], [14, 7, "a"], [14, 8, "a"], [14, 9, "a"], [13, 5, "a"], [13, 6, "a"], [13, 9, "a"], [13, 10, "a"],
    ] as [number, number, string][]) {
      if (j === 7.5) {
        p(i, 7, k);
        p(i, 8, k);
      } else p(i, j, k);
    }
  } else {
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
        if (d > 7.2 && d <= 8.2 && (x + y) % 2 === 0) g[y][x] = "o";
      }
    // a little lit fuse in the top-right corner
    for (const [x, y, k] of [
      [12, 1, "a"], [13, 0, "w"], [14, 1, "a"], [13, 2, "a"], [11, 2, "o"],
    ] as [number, number, string][]) set(x, y, k);
  }
  return g.map((r) => r.join(""));
}
