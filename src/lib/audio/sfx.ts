import { noise, tone } from "./engine.ts";

export type SfxName =
  | "click"
  | "swap"
  | "invalid"
  | "match"
  | "combo"
  | "special"
  | "line"
  | "bomb"
  | "color"
  | "ice"
  | "star"
  | "victory"
  | "defeat"
  | "shuffle";

// C major pentatonic: any run of notes sounds pleasant, and a cascade climbs it.
const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

/** Every sound is a fixed recipe. The only input is a step index (combo level, star number). */
export function playSfx(name: SfxName, n = 0) {
  switch (name) {
    case "click":
      tone(740, 0.06, { gain: 0.12, type: "triangle" });
      break;
    case "swap":
      noise(0.12, { gain: 0.1, from: 500, to: 1500 });
      break;
    case "invalid":
      tone(190, 0.16, { type: "triangle", gain: 0.2, slideTo: 120 });
      break;
    case "match": {
      const f = PENTA[Math.min(Math.max(n - 1, 0), PENTA.length - 1)];
      tone(f, 0.22, { gain: 0.2 });
      tone(f * 2, 0.16, { gain: 0.05, type: "triangle", delay: 0.015 });
      break;
    }
    case "combo": {
      const notes = [0, 2, 4, 7].slice(0, Math.min(4, 1 + n));
      notes.forEach((i, k) => tone(PENTA[i + 3] * 1, 0.18, { gain: 0.12, delay: k * 0.06, type: "triangle" }));
      break;
    }
    case "special":
      [1046.5, 1318.5, 1568].forEach((f, k) => tone(f, 0.22, { gain: 0.1, delay: k * 0.05 }));
      break;
    case "line":
      noise(0.35, { gain: 0.16, from: 3200, to: 300 });
      tone(660, 0.3, { gain: 0.1, slideTo: 220, type: "triangle" });
      break;
    case "bomb":
      tone(150, 0.45, { gain: 0.35, slideTo: 40 });
      noise(0.5, { gain: 0.2, from: 2400, to: 120, type: "lowpass" });
      break;
    case "color":
      [523, 659, 784, 1047, 1319, 1568].forEach((f, k) => tone(f, 0.3, { gain: 0.11, delay: k * 0.045, type: "triangle" }));
      noise(0.5, { gain: 0.08, from: 5000, to: 800 });
      break;
    case "ice":
      tone(1900, 0.09, { gain: 0.09, type: "square", slideTo: 900, lowpass: 3500 });
      break;
    case "star": {
      const f = PENTA[5 + Math.min(n, 3) * 2];
      tone(f, 0.5, { gain: 0.18 });
      tone(f * 1.5, 0.4, { gain: 0.06, delay: 0.03 });
      break;
    }
    case "victory":
      [0, 2, 4, 7, 9].forEach((i, k) => tone(PENTA[i + 1], k === 4 ? 0.9 : 0.28, { gain: 0.18, delay: k * 0.14, type: "triangle" }));
      break;
    case "defeat":
      [440, 392, 349.23, 293.66].forEach((f, k) => tone(f, 0.5, { gain: 0.14, delay: k * 0.22, type: "sine", lowpass: 1800 }));
      break;
    case "shuffle":
      noise(0.5, { gain: 0.1, from: 400, to: 2400 });
      break;
  }
}
