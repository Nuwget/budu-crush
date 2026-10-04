import type { Lang } from "../i18n/index.ts";

export type MotionPref = "system" | "reduce" | "full";

export interface LevelRecord {
  stars: number;
  best: number;
}

export interface Saved {
  v: 1;
  lang: Lang | null;
  settings: { music: boolean; sfx: boolean; haptics: boolean; motion: MotionPref };
  progress: { unlocked: number; levels: Record<number, LevelRecord>; tutorialDone: boolean };
}

export const KEY = "budu:v1";

export const DEFAULTS: Saved = {
  v: 1,
  lang: null,
  settings: { music: true, sfx: true, haptics: true, motion: "system" },
  progress: { unlocked: 1, levels: {}, tutorialDone: false },
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Merge whatever is stored over the defaults, ignoring anything of the wrong shape. */
export function sanitize(raw: unknown): Saved {
  const out: Saved = structuredClone(DEFAULTS);
  if (!isObj(raw)) return out;
  if (raw.lang === "pt" || raw.lang === "en") out.lang = raw.lang;
  if (isObj(raw.settings)) {
    const s = raw.settings;
    if (typeof s.music === "boolean") out.settings.music = s.music;
    if (typeof s.sfx === "boolean") out.settings.sfx = s.sfx;
    if (typeof s.haptics === "boolean") out.settings.haptics = s.haptics;
    if (s.motion === "system" || s.motion === "reduce" || s.motion === "full") out.settings.motion = s.motion;
  }
  if (isObj(raw.progress)) {
    const p = raw.progress;
    if (typeof p.unlocked === "number" && p.unlocked >= 1) out.progress.unlocked = Math.floor(p.unlocked);
    if (typeof p.tutorialDone === "boolean") out.progress.tutorialDone = p.tutorialDone;
    if (isObj(p.levels))
      for (const [k, v] of Object.entries(p.levels)) {
        const n = Number(k);
        if (Number.isInteger(n) && n >= 1 && isObj(v) && typeof v.stars === "number" && typeof v.best === "number")
          out.progress.levels[n] = { stars: Math.min(3, Math.max(0, Math.floor(v.stars))), best: Math.max(0, Math.floor(v.best)) };
      }
  }
  return out;
}

export function load(): Saved {
  try {
    const text = window.localStorage.getItem(KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save(data: Saved) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode or storage blocked: the game still works, it just forgets */
  }
}
