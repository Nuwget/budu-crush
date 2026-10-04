import type { Grid } from "./shapes.ts";
import type { Palette } from "./palette.ts";
import { SIZE } from "./shapes.ts";

/** Merge horizontal runs of one colour into rects: a 16x16 charm is a few dozen shapes. */
export function gridToSvg(grid: Grid, palette: Palette): string {
  const rects: string[] = [];
  for (let y = 0; y < grid.length; y++) {
    let x = 0;
    while (x < grid[y].length) {
      const key = grid[y][x];
      if (key === "." || !palette[key]) {
        x++;
        continue;
      }
      let e = x + 1;
      while (e < grid[y].length && grid[y][e] === key) e++;
      rects.push(`<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${palette[key]}"/>`);
      x = e;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

export const svgDataUri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
