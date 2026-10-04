import { CHARM_IDS } from "../kinds.ts";
import { PALETTES } from "./palette.ts";
import { buildGrid, buildOrb, buildOverlay } from "./shapes.ts";
import type { Grid } from "./shapes.ts";
import { gridToSvg, svgDataUri } from "./svg.ts";

export const CHARM_GRIDS: Record<string, Grid> = {
  ...Object.fromEntries(CHARM_IDS.map((id) => [id, buildGrid(id)])),
  orb: buildOrb(),
};

export const OVERLAY_GRIDS: Record<string, Grid> = {
  lineH: buildOverlay("lineH"),
  lineV: buildOverlay("lineV"),
  bomb: buildOverlay("bomb"),
};

/**
 * One stylesheet holding every piece of art as a data-URI background (.charm-moon,
 * .overlay-bomb, ...). Pure string work, so it renders identically on server and client.
 */
export function artCss(): string {
  const rules: string[] = [];
  for (const [name, grid] of Object.entries(CHARM_GRIDS)) rules.push(`.charm-${name}{background-image:${svgDataUri(gridToSvg(grid, PALETTES[name]))}}`);
  for (const [name, grid] of Object.entries(OVERLAY_GRIDS)) rules.push(`.overlay-${name}{background-image:${svgDataUri(gridToSvg(grid, PALETTES[name]))}}`);
  return rules.join("\n");
}
