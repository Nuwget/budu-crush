import { getSaved } from "../state/store.ts";

export type Haptic = "select" | "swap" | "match" | "combo" | "big" | "special" | "victory" | "defeat";

const PATTERNS: Record<Haptic, number | number[]> = {
  select: 8,
  swap: 10,
  match: 14,
  combo: [18, 30, 22],
  big: [24, 36, 24, 36, 44],
  special: 42,
  victory: [30, 60, 30, 60, 50],
  defeat: 60,
};

/** Vibrates on devices that support it (Android). A silent no-op on iOS and desktop. */
export function haptic(kind: Haptic, reduceMotion = false) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (reduceMotion || !getSaved().settings.haptics) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* some browsers throw when the page was not tapped yet */
  }
}
