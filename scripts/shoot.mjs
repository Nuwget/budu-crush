// Screenshot walkthrough for visual checks.
//   npm run build && python3 -m http.server 4191 --directory out &
//   BASE=http://localhost:4191/ node scripts/shoot.mjs <outDir> [WxH ...]
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const outDir = process.argv[2] ?? "shots";
const sizes = (process.argv.length > 3 ? process.argv.slice(3) : ["393x852"]).map((s) => s.split("x").map(Number));
const base = process.env.BASE ?? "http://localhost:4191/";
mkdirSync(outDir, { recursive: true });

const root = join(homedir(), ".cache/ms-playwright");
const dir = readdirSync(root).find((d) => d.startsWith("chromium-"));
const exe = join(root, dir, "chrome-linux64/chrome");
const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined, args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });

const SAVED = {
  v: 1,
  lang: "en",
  settings: { music: true, sfx: true, haptics: true, motion: "system" },
  progress: { unlocked: 8, tutorialDone: true, levels: { 1: { stars: 3, best: 3600 }, 2: { stars: 2, best: 2800 }, 3: { stars: 1, best: 2700 }, 4: { stars: 3, best: 6500 }, 5: { stars: 2, best: 3700 }, 6: { stars: 1, best: 3300 }, 7: { stars: 2, best: 4000 } } },
};

for (const [W, H] of sizes) {
  const tag = `${W}x${H}`;
  const errors = [];
  const open = async (saved) => {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: W < 800, isMobile: W < 800 });
    if (saved) await ctx.addInitScript((s) => localStorage.setItem("budu:v1", JSON.stringify(s)), saved);
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    await page.goto(base, { waitUntil: "load" });
    return { ctx, page };
  };
  const shot = (page, name) => page.screenshot({ path: join(outDir, `${tag}-${name}.png`) });

  // first launch
  let { ctx, page } = await open(null);
  await page.waitForTimeout(2000);
  await shot(page, "01-language");
  await page.getByRole("button", { name: /English/ }).click();
  await page.waitForTimeout(3200);
  await shot(page, "02-home");
  await ctx.close();

  // returning player
  ({ ctx, page } = await open(SAVED));
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Map" }).click();
  await page.waitForTimeout(3500);
  await shot(page, "03-map");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForTimeout(800);
  await shot(page, "04-settings");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  for (const level of [3, 4]) {
    await page.getByRole("button", { name: new RegExp(`^Level 0?${level}(\\.|$)`) }).click();
    await page.waitForTimeout(3200);
    await shot(page, `05-level${level}`);
    await page.getByRole("button", { name: "Back" }).click();
    await page.waitForTimeout(2800);
  }
  await ctx.close();
  console.log(tag, errors.join("\n") || "no console errors");
}
await browser.close();
