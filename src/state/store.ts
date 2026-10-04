"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "../i18n/index.ts";
import type { MotionPref, Saved } from "./persistence.ts";
import { DEFAULTS, load, save } from "./persistence.ts";

export interface Snapshot extends Saved {
  /** False on the server and during hydration; true once localStorage has been read. */
  ready: boolean;
}

const SERVER: Snapshot = { ...DEFAULTS, ready: false };
let current: Snapshot | null = null;
const listeners = new Set<() => void>();
let saveTimer = 0;

function snapshot(): Snapshot {
  if (current) return current;
  current = { ...load(), ready: true };
  return current;
}

function commit(next: Saved) {
  current = { ...next, ready: true };
  listeners.forEach((l) => l());
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => save(next), 150);
}

function update(fn: (draft: Saved) => Saved) {
  const { ready: _ready, ...saved } = snapshot();
  void _ready;
  commit(fn(structuredClone(saved)));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const useSaved = (): Snapshot => useSyncExternalStore(subscribe, snapshot, () => SERVER);

/** Read without subscribing (event handlers, engines). */
export const getSaved = (): Snapshot => (typeof window === "undefined" ? SERVER : snapshot());

export const actions = {
  setLang: (lang: Lang) => update((d) => ({ ...d, lang })),
  setSetting: <K extends keyof Saved["settings"]>(key: K, value: Saved["settings"][K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [key]: value } })),
  setMotion: (motion: MotionPref) => update((d) => ({ ...d, settings: { ...d.settings, motion } })),
  tutorialDone: () => update((d) => ({ ...d, progress: { ...d.progress, tutorialDone: true } })),
  /** Records a finished level: keeps the best score and stars, unlocks the next level. */
  completeLevel: (level: number, score: number, stars: number, total: number) =>
    update((d) => {
      const prev = d.progress.levels[level];
      return {
        ...d,
        progress: {
          ...d.progress,
          unlocked: Math.min(total, Math.max(d.progress.unlocked, level + 1)),
          levels: {
            ...d.progress.levels,
            [level]: { stars: Math.max(prev?.stars ?? 0, stars), best: Math.max(prev?.best ?? 0, score) },
          },
        },
      };
    }),
  resetProgress: () => update((d) => ({ ...d, progress: structuredClone(DEFAULTS.progress) })),
};
