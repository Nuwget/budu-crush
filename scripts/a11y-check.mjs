// Keyboard play, reduced motion, and persistence checks against the built game.
//   BASE=http://localhost:4191/ node scripts/a11y-check.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const base = process.env.BASE ?? "http://localhost:4191/";
const root = join(homedir(), ".cache/ms-playwright");
const exe = join(root, readdirSync(root).find((d) => d.startsWith("chromium-")), "chrome-linux64/chrome");
const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const SAVED = { v: 1, lang: "en", settings: { music: true, sfx: true, haptics: true, motion: "system" }, progress: { unlocked: 2, tutorialDone: true, levels: {} } };

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, ...opts });
  await ctx.addInitScript((s) => { if (!localStorage.getItem("budu:v1")) localStorage.setItem("budu:v1", JSON.stringify(s)); }, SAVED);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
let ok = 0;
const pass = (n) => console.log("ok   ", n, "") || ok++;

// 1. keyboard: pick a tile with Enter, swap with an arrow, moves go down only on a valid swap
{
  const { ctx, page, errors } = await open();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.waitForTimeout(2500);
  const surface = page.locator(".board-surface");
  await surface.focus();
  const movesBefore = Number(await page.locator(".moves-num").textContent());
  let changed = false;
  for (let i = 0; i < 40 && !changed; i++) {
    await page.keyboard.press("Enter");
    await page.keyboard.press(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][i % 4]);
    await page.waitForTimeout(1300);
    changed = Number(await page.locator(".moves-num").textContent()) < movesBefore;
    if (!changed) { await page.keyboard.press("Escape"); await page.keyboard.press(["ArrowRight", "ArrowDown"][i % 2]); }
  }
  assert.ok(changed, "a keyboard swap should use a move");
  assert.equal(await surface.getAttribute("role"), "application");
  assert.equal(errors.length, 0, errors.join());
  pass("keyboard swap works"); await ctx.close();
}

// 2. reduced motion (OS preference): decorative animations are off, the game still works
{
  const { ctx, page } = await open({ reducedMotion: "reduce" });
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector(".world-moon")).animationDuration);
  assert.ok(parseFloat(dur) < 0.01, `moon animation should be frozen, got ${dur}`);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.waitForTimeout(1500);
  assert.ok(await page.locator(".board-surface").count());
  pass("prefers-reduced-motion freezes animation and the game still loads"); await ctx.close();
}

// 3. in-game motion setting wins over the OS
{
  const { ctx, page } = await open();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator(".seg").nth(1).getByRole("radio", { name: "On" }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), "reduce");
  pass("motion setting applies to <html>"); await ctx.close();
}

// 4. persistence: language, settings and progress survive a reload
{
  const { ctx, page } = await open();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("radio", { name: "Português" }).click();
  await page.getByRole("switch", { name: /Music|Música/ }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForTimeout(1800);
  assert.equal(await page.evaluate(() => document.documentElement.lang), "pt-BR");
  assert.ok(await page.getByRole("button", { name: /Continuar/ }).count(), "home should be in Portuguese");
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("budu:v1")));
  assert.equal(s.lang, "pt");
  assert.equal(s.settings.music, false);
  assert.equal(s.progress.unlocked, 2);
  pass("language, settings and progress persist"); await ctx.close();
}

// 5. no horizontal overflow and the board is fully on screen at the common sizes
for (const [w, h] of [[393, 852], [375, 812], [430, 932], [768, 1024], [1440, 900]]) {
  const { ctx, page } = await open({ viewport: { width: w, height: h } });
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.waitForTimeout(2300);
  const m = await page.evaluate(() => {
    const r = document.querySelector(".board").getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight };
  });
  assert.ok(m.left >= 0 && m.right <= m.iw + 0.5 && m.bottom <= m.ih + 0.5, `${w}x${h}: board off screen ${JSON.stringify(m)}`);
  assert.ok(m.sw <= m.iw, `${w}x${h}: horizontal overflow`);
  pass(`board fits at ${w}x${h}`); await ctx.close();
}
console.log(`\n${ok} checks passed`);
await browser.close();
