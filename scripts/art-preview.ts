// Run with: node scripts/art-preview.ts <out.png>  — renders every charm and overlay into one sheet.
import sharp from "sharp";
import { CHARM_GRIDS, OVERLAY_GRIDS } from "../src/game/tiles/art/index.ts";
import { PALETTES } from "../src/game/tiles/art/palette.ts";
import { gridToSvg } from "../src/game/tiles/art/svg.ts";

const out = process.argv[2] ?? "art-preview.png";
const names = ["moon", "star", "cloud", "heart", "crystal", "flower", "orb"];
const S = 96;
const tiles: { input: Buffer; left: number; top: number }[] = [];
for (let i = 0; i < names.length; i++) {
  const svg = gridToSvg(CHARM_GRIDS[names[i]], PALETTES[names[i]]);
  tiles.push({ input: await sharp(Buffer.from(svg), { density: 72 * (S / 16) }).resize(S, S, { kernel: "nearest" }).png().toBuffer(), left: 8 + i * (S + 8), top: 8 });
}
// specials: flower with each overlay
for (let i = 0; i < 3; i++) {
  const o = ["lineH", "lineV", "bomb"][i];
  const base = await sharp(Buffer.from(gridToSvg(CHARM_GRIDS.heart, PALETTES.heart)), { density: 72 * (S / 16) }).resize(S, S).png().toBuffer();
  const over = await sharp(Buffer.from(gridToSvg(OVERLAY_GRIDS[o], PALETTES[o])), { density: 72 * (S / 16) }).resize(S, S).png().toBuffer();
  tiles.push({ input: base, left: 8 + i * (S + 8), top: S + 16 });
  tiles.push({ input: over, left: 8 + i * (S + 8), top: S + 16 });
}
// small size (what a phone shows)
for (let i = 0; i < names.length; i++) {
  const svg = gridToSvg(CHARM_GRIDS[names[i]], PALETTES[names[i]]);
  tiles.push({ input: await sharp(Buffer.from(svg), { density: 72 * (38 / 16) }).resize(38, 38).png().toBuffer(), left: 8 + i * 46, top: 2 * S + 28 });
}
await sharp({ create: { width: 8 + names.length * (S + 8), height: 2 * S + 80, channels: 4, background: "#1b1250" } }).composite(tiles).png().toFile(out);
console.log("wrote", out);
