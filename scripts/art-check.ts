// Run with: node scripts/art-check.ts
// Verifies every charm grid is 16x16, uses only palette keys, and that the six silhouettes
// differ from each other (so the pieces are told apart by shape, not only by colour).
import assert from "node:assert/strict";
import { CHARM_GRIDS, OVERLAY_GRIDS } from "../src/game/tiles/art/index.ts";
import { PALETTES } from "../src/game/tiles/art/palette.ts";
import { CHARM_IDS } from "../src/game/tiles/kinds.ts";
import { SIZE } from "../src/game/tiles/art/shapes.ts";

const all = { ...CHARM_GRIDS, ...OVERLAY_GRIDS };
for (const [name, grid] of Object.entries(all)) {
  assert.equal(grid.length, SIZE, `${name} rows`);
  for (const row of grid) {
    assert.equal(row.length, SIZE, `${name} cols`);
    for (const ch of row) assert.ok(ch === "." || ch in PALETTES[name], `${name} uses unknown key ${ch}`);
  }
  const filled = grid.join("").replace(/\./g, "").length;
  assert.ok(filled >= 6, `${name} is nearly empty`);
}

const mask = (name: string) => CHARM_GRIDS[name].join("").split("").map((c) => c !== ".");
let minDistance = Infinity;
let pair = "";
for (let i = 0; i < CHARM_IDS.length; i++)
  for (let j = i + 1; j < CHARM_IDS.length; j++) {
    const a = mask(CHARM_IDS[i]);
    const b = mask(CHARM_IDS[j]);
    const d = a.filter((v, k) => v !== b[k]).length;
    if (d < minDistance) {
      minDistance = d;
      pair = `${CHARM_IDS[i]}/${CHARM_IDS[j]}`;
    }
  }
console.log(`closest silhouette pair: ${pair} differs in ${minDistance} of ${SIZE * SIZE} pixels`);
assert.ok(minDistance >= 28, "two charms have too similar a silhouette");

for (const name of [...CHARM_IDS, "orb"]) {
  console.log(`\n${name}`);
  console.log(CHARM_GRIDS[name].join("\n"));
}
console.log("\nart ok");
