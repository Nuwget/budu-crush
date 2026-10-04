// Plays the built game through the real UI (pointer drags on the board) and prints what happens.
//   node scripts/play-bot.mjs <outDir> [WxH] [levelCount]
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const outDir = process.argv[2] ?? "shots";
const [W, H] = (process.argv[3] ?? "393x852").split("x").map(Number);
const base = process.env.BASE ?? "http://localhost:4191/";
mkdirSync(outDir, { recursive: true });
const root = join(homedir(), ".cache/ms-playwright");
const dir = readdirSync(root).find((d) => d.startsWith("chromium-"));
const exe = join(root, dir, "chrome-linux64/chrome");
const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined, args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
if (process.env.UNLOCKED) await ctx.addInitScript((n) => localStorage.setItem("budu:v1", JSON.stringify({ v: 1, lang: "en", settings: { music: true, sfx: true, haptics: true, motion: "system" }, progress: { unlocked: n, tutorialDone: true, levels: {} } })), Number(process.env.UNLOCKED));
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
const shot = (n) => page.screenshot({ path: join(outDir, `${n}.png`) });

/** The board as the DOM shows it: [row][col] -> charm name or special. */
const readBoard = () =>
  page.evaluate(() => {
    const surf = document.querySelector(".board-surface");
    const rect = surf.getBoundingClientRect();
    const frame = surf.parentElement;
    const cs = getComputedStyle(frame.closest(".board"));
    const cols = Number(cs.getPropertyValue("--cols")), rows = Number(cs.getPropertyValue("--rows"));
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (const t of surf.querySelectorAll(".tile")) {
      if (t.classList.contains("fx-clear")) continue;
      const r = Number(t.style.getPropertyValue("--r")), c = Number(t.style.getPropertyValue("--c"));
      const art = t.querySelector(".tile-art");
      const kind = [...art.classList].find((x) => x.startsWith("charm-"));
      if (grid[r]?.[c] !== undefined) grid[r][c] = { kind, special: [...t.classList].find((x) => /^is-(lineH|lineV|bomb|color)$/.test(x)) ?? "" };
    }
    return { grid, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, rows, cols };
  });

function runAt(g, r, c) {
  const k = g[r]?.[c]?.kind; if (!k || k === "charm-orb") return false;
  let n = 1; for (let i = c - 1; i >= 0 && g[r][i]?.kind === k; i--) n++; for (let i = c + 1; i < g[0].length && g[r][i]?.kind === k; i++) n++;
  if (n >= 3) return true;
  n = 1; for (let i = r - 1; i >= 0 && g[i][c]?.kind === k; i--) n++; for (let i = r + 1; i < g.length && g[i][c]?.kind === k; i++) n++;
  return n >= 3;
}
function findMoves(g) {
  const out = [];
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
    const r2 = r + dr, c2 = c + dc; if (!g[r2]?.[c2] || !g[r][c]) continue;
    const a = g[r][c], b = g[r2][c2];
    let ok = a.special || b.special;
    if (!ok) { g[r][c] = b; g[r2][c2] = a; ok = runAt(g, r, c) || runAt(g, r2, c2); g[r][c] = a; g[r2][c2] = b; }
    if (ok) out.push([[r, c], [r2, c2], !!(a.special || b.special)]);
  }
  return out;
}
async function drag(rect, rows, cols, a, b) {
  const cw = rect.w / cols, ch = rect.h / rows;
  const p = (cell) => [rect.x + (cell[1] + 0.5) * cw, rect.y + (cell[0] + 0.5) * ch];
  const [x1, y1] = p(a), [x2, y2] = p(b);
  await page.mouse.move(x1, y1); await page.mouse.down();
  for (let i = 1; i <= 4; i++) await page.mouse.move(x1 + ((x2 - x1) * i) / 4, y1 + ((y2 - y1) * i) / 4);
  await page.mouse.up();
}
const text = (sel) => page.locator(sel).first().textContent().catch(() => "");

await page.goto(base, { waitUntil: "load" });
await page.waitForTimeout(1500);
if (!process.env.UNLOCKED) {
  await page.getByRole("button", { name: /English/ }).tap();
  await page.waitForTimeout(3000);
}
await page.getByRole("button", { name: /^Play$|^Continue/ }).tap();
await page.waitForTimeout(2500);
console.log("level:", await text(".hud-level"));

let moves = 0, shots = 0;
for (let i = 0; i < Number(process.env.MAXMOVES ?? 40); i++) {
  if (await page.locator(".screen-end").count()) break;
  const phase = await page.locator(".board").getAttribute("data-phase").catch(() => null);
  if (phase !== "idle") { await page.waitForTimeout(250); continue; }
  const { grid, rect, rows, cols } = await readBoard();
  const list = findMoves(grid);
  if (!list.length) { console.log("no moves visible?"); await page.waitForTimeout(500); continue; }
  // prefer special moves, then a random one
  const pick = process.env.BAD ? list[0] : (list.find((m) => m[2]) ?? list[Math.floor(Math.random() * list.length)]);
  if (i === 2) { // an invalid swap, to see the bounce
    const bad = [[0, 0], [0, 1]];
    await drag(rect, rows, cols, bad[0], bad[1]);
    await page.waitForTimeout(120); await shot("04-invalid-midway");
    await page.waitForTimeout(900);
  }
  await drag(rect, rows, cols, pick[0], pick[1]);
  moves++;
  if (shots < 6 && moves % 2 === 1) { await page.waitForTimeout(330); await shot(`05-move${moves}-mid`); shots++; }
  await page.waitForTimeout(process.env.FAST ? 1000 : 1600);
  const score = await text(".score-num"), left = await text(".moves-num");
  console.log(`move ${moves}: score=${score} moves=${left}`);
}
await page.waitForTimeout(2500);
await shot("06-end");
console.log("ended on:", (await text(".end-title")) || (await text(".hud-level")));
console.log(errors.join("\n") || "no console errors");
await browser.close();
