import { audioNow, bell, duckMusic, noise, tone } from "./engine.ts";

export type SfxName =
  | "click"
  | "ui"
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
  | "shuffle"
  | "callout"
  | "tick"
  | "obj"
  | "near"
  | "pop";

// C major pentatonic (the same notes as the A minor of the music): any run sounds pleasant, and a cascade climbs it.
//             C4      D4      E4      G4   A4   C5      D5      E5      G5   A5   C6
const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568];

/** The note a cascade wave sounds: it climbs one step per wave, then keeps circling the top of the scale. */
const waveNote = (n: number) => PENTA[n <= 9 ? 2 + Math.max(0, n - 1) : 7 + ((n - 10) % 5)];

/**
 * The language, in one place:
 *   touch / swap      tiny, dry, tactile: a tick and a breath of air
 *   match             tap -> struck note -> a soft sparkle above it; the note climbs with every cascade wave
 *   callout           the word: warm and small at "Delícia!", more notes and a chord as the play gets bigger
 *   MEGA              a short intake of breath (silence with a swell), then the whole chord at once
 *   score             a bright little tick when the points arrive
 *   star / victory    anticipation, reveal, warm completion; silence is part of the phrase
 * Louder is never the answer: each step up adds notes, overtones and a bigger room, not volume.
 */

/** Minimum time between two sounds of the same kind (audio-clock seconds): a flurry never turns into a buzz. */
const GAP: Partial<Record<SfxName, number>> = { click: 0.03, match: 0.05, tick: 0.045, pop: 0.04, swap: 0.05, ice: 0.04, obj: 0.08 };
const lastAt: Partial<Record<SfxName, number>> = {};

/** Every sound is a fixed recipe. The only input is a step index (combo level, star number, wave). */
export function playSfx(name: SfxName, n = 0) {
  const now = audioNow();
  const gap = GAP[name];
  if (gap) {
    if (now - (lastAt[name] ?? -9) < gap) return;
    lastAt[name] = now;
  }
  switch (name) {
    case "click": // a finger lands on a piece
      noise(0.018, { gain: 0.05, from: 2800, q: 1.2, priority: 2 });
      tone(880, 0.05, { gain: 0.06, priority: 2 });
      break;
    case "ui": // a button
      noise(0.014, { gain: 0.04, from: 2200, q: 1 });
      bell(n ? 784 : 587.33, 0.16, { gain: 0.085, parts: 2, wet: 0.2 });
      bell(n ? 1174.66 : 880, 0.12, { gain: 0.03, parts: 1, delay: 0.035 });
      break;
    case "swap": // the two pieces trade places: a breath of air with a soft landing
      noise(0.11, { gain: 0.07, from: 650, to: 2100, q: 0.8 });
      tone(330, 0.09, { gain: 0.05, type: "triangle", slideTo: 440, lowpass: 1800, delay: 0.05 });
      break;
    case "invalid": // "uh-oh", kind: two soft low notes, no buzz
      tone(262, 0.14, { gain: 0.11, type: "triangle", slideTo: 220, lowpass: 900, priority: 2 });
      tone(208, 0.2, { gain: 0.1, type: "triangle", slideTo: 165, lowpass: 800, delay: 0.1, priority: 2 });
      break;
    case "match": {
      const f = waveNote(n);
      // tap -> struck note -> sparkle above it
      noise(0.012, { gain: 0.045, from: 2400, q: 1.4, priority: 2 });
      bell(f, 0.3, { gain: 0.17, wet: 0.25, priority: 2 });
      bell(f * 3, 0.2, { gain: 0.04, parts: 1, delay: 0.05, wet: 0.5, priority: 0 });
      if (n >= 2) bell(f * 1.5, 0.26, { gain: 0.07, parts: 2, delay: 0.018, wet: 0.3 }); // a fifth: more harmony with every wave
      if (n >= 4) bell(f * 2, 0.22, { gain: 0.06, parts: 2, delay: 0.035, wet: 0.35 });
      break;
    }
    case "combo": {
      // body under the cascade: a soft chord that grows with the tier. The word carries the melody.
      if (n < 2) break;
      const root = n >= 3 ? 130.81 : 146.83;
      tone(root, 0.5, { gain: 0.09, attack: 0.03, lowpass: 600, wet: 0.2 });
      tone(root * 1.5, 0.45, { gain: 0.05, attack: 0.04, lowpass: 700, wet: 0.2 });
      if (n >= 3) tone(66, 0.34, { gain: 0.16, slideTo: 52, attack: 0.004, priority: 2 });
      break;
    }
    case "callout": {
      if (n <= 1) {
        // "Delícia!": soft, warm, almost edible: a little hum that lifts, then two notes like a tiny ding-dong
        tone(300, 0.14, { gain: 0.05, slideTo: 440, type: "triangle", lowpass: 1100, attack: 0.02, wet: 0.2 });
        bell(PENTA[8], 0.34, { gain: 0.1, delay: 0.07, wet: 0.45 });
        bell(PENTA[10], 0.5, { gain: 0.085, delay: 0.17, wet: 0.55 });
        bell(PENTA[12], 0.25, { gain: 0.025, parts: 1, delay: 0.24, wet: 0.6, priority: 0 });
      } else if (n === 2) {
        [7, 8, 10].forEach((i, k) => bell(PENTA[i], 0.42, { gain: 0.1, delay: 0.03 + k * 0.07, wet: 0.45 }));
        bell(PENTA[12], 0.3, { gain: 0.03, parts: 1, delay: 0.26, wet: 0.6, priority: 0 });
      } else if (n === 3) {
        [5, 7, 8, 10].forEach((i, k) => bell(PENTA[i], 0.5, { gain: 0.1, delay: 0.02 + k * 0.06, wet: 0.5 }));
        // a chord opens under the last note
        [5, 7, 8].forEach((i) => tone(PENTA[i], 0.7, { gain: 0.035, attack: 0.05, delay: 0.2, lowpass: 1600, wet: 0.5 }));
        noise(0.35, { gain: 0.03, from: 5200, to: 2400, delay: 0.1, priority: 0 });
      } else {
        // MEGA: a breath in (a swell and a hole of silence), then the whole chord lands together
        duckMusic(0.2, 0.9, 0.9);
        noise(0.17, { gain: 0.07, from: 500, to: 3600, swell: 0.16, q: 0.7, priority: 2 });
        tone(196, 0.17, { gain: 0.04, slideTo: 392, attack: 0.1, lowpass: 900, priority: 2 });
        const hit = 0.18;
        [5, 7, 8, 10, 12].forEach((i, k) => bell(PENTA[i], 1.0, { gain: 0.115 - k * 0.006, delay: hit + k * 0.012, wet: 0.6, priority: 2 }));
        tone(65.41, 0.55, { gain: 0.19, slideTo: 49, attack: 0.004, delay: hit, priority: 2 });
        tone(130.81, 0.9, { gain: 0.07, attack: 0.02, delay: hit, lowpass: 700, wet: 0.3, priority: 2 });
        noise(0.7, { gain: 0.05, from: 7000, to: 2500, delay: hit + 0.02, wet: 0.4, priority: 0 });
        [13, 12, 11, 12, 13].forEach((i, k) => bell(PENTA[i], 0.35, { gain: 0.035, parts: 1, delay: hit + 0.12 + k * 0.07, wet: 0.7, priority: 0 }));
      }
      break;
    }
    case "tick": {
      // the points arrive: small, bright, finished
      const f = PENTA[Math.min(8 + n, 11)];
      bell(f, 0.12, { gain: 0.05, parts: 2, wet: 0.25, priority: 0 });
      break;
    }
    case "obj": // progress on the goal
      bell(PENTA[7], 0.18, { gain: 0.07, parts: 2, wet: 0.3 });
      bell(PENTA[9], 0.2, { gain: 0.05, parts: 1, delay: 0.06, wet: 0.35 });
      break;
    case "near": // "almost there": two notes lifting, left open
      bell(PENTA[7], 0.5, { gain: 0.07, wet: 0.5 });
      bell(PENTA[9], 0.7, { gain: 0.07, delay: 0.14, wet: 0.6 });
      break;
    case "special":
      [10, 12, 13].forEach((i, k) => bell(PENTA[i], 0.35, { gain: 0.09, delay: k * 0.05, wet: 0.5 }));
      break;
    case "line":
      noise(0.34, { gain: 0.1, from: 3200, to: 350, q: 0.9, priority: 2 });
      tone(660, 0.3, { gain: 0.06, slideTo: 240, type: "triangle", lowpass: 2000 });
      bell(PENTA[10], 0.3, { gain: 0.07, delay: 0.02, wet: 0.4 });
      break;
    case "bomb":
      tone(150, 0.4, { gain: 0.26, slideTo: 42, priority: 2 });
      noise(0.5, { gain: 0.16, from: 2200, to: 120, type: "lowpass", priority: 2 });
      bell(PENTA[5], 0.4, { gain: 0.08, delay: 0.03, wet: 0.5 });
      break;
    case "color":
      [5, 7, 8, 10, 12, 13].forEach((i, k) => bell(PENTA[i], 0.45, { gain: 0.09, delay: k * 0.045, wet: 0.5, parts: 2 }));
      noise(0.5, { gain: 0.06, from: 5000, to: 800, wet: 0.3, priority: 0 });
      break;
    case "ice": // a glassy tink, not a click
      bell(2093, 0.14, { gain: 0.07, parts: 2, wet: 0.3 });
      tone(1568, 0.07, { gain: 0.03, slideTo: 1100, lowpass: 3600 });
      break;
    case "star": {
      // anticipation -> bright reveal -> warm completion
      duckMusic(0.45, 0.5, 0.6);
      const base = PENTA[Math.min(5 + Math.min(n, 2) * 2, 9)];
      noise(0.14, { gain: 0.05, from: 900, to: 4200, swell: 0.13, q: 0.8, priority: 2 });
      const hit = 0.14;
      bell(base, 0.7, { gain: 0.16, delay: hit, wet: 0.5, priority: 2 });
      bell(base * 1.25, 0.6, { gain: 0.09, delay: hit + 0.02, wet: 0.5, priority: 2 });
      bell(base * 1.5, 0.6, { gain: 0.09, delay: hit + 0.04, wet: 0.5, priority: 2 });
      bell(base * 2, 0.4, { gain: 0.05, parts: 1, delay: hit + 0.1, wet: 0.7, priority: 0 });
      tone(base / 2, 0.8, { gain: 0.08, attack: 0.06, delay: hit + 0.06, lowpass: 900, wet: 0.3 });
      break;
    }
    case "victory": {
      // a breath, then the reveal, then the room fills with light
      duckMusic(0.2, 1.8, 1.2);
      noise(0.22, { gain: 0.035, from: 1100, to: 2600, swell: 0.2, q: 0.6, priority: 2 });
      const t0 = 0.26;
      [5, 7, 8, 9, 10].forEach((i, k) => bell(PENTA[i], 0.5, { gain: 0.14, delay: t0 + k * 0.11, wet: 0.45, priority: 2 }));
      const t1 = t0 + 0.62;
      [5, 7, 8, 10].forEach((i, k) => bell(PENTA[i], 1.6, { gain: 0.1, delay: t1 + k * 0.014, wet: 0.65, priority: 2 }));
      tone(130.81, 1.3, { gain: 0.09, attack: 0.05, delay: t1, lowpass: 700, wet: 0.3, priority: 2 });
      [12, 13, 12, 11, 13, 12, 13].forEach((i, k) => bell(PENTA[i], 0.4, { gain: 0.03, parts: 1, delay: t1 + 0.15 + k * 0.1, wet: 0.7, priority: 0 }));
      break;
    }
    case "defeat": // consoling, not punishing: three soft falling notes in a big room
      [PENTA[8], PENTA[7], PENTA[5]].forEach((f, k) => tone(f, 0.7, { gain: 0.1, delay: k * 0.3, attack: 0.03, lowpass: 1300, wet: 0.55, priority: 2 }));
      tone(130.81, 1.2, { gain: 0.06, attack: 0.15, delay: 0.5, lowpass: 500, wet: 0.3, priority: 2 });
      break;
    case "pop":
      tone(520 + n * 90, 0.07, { gain: 0.07, type: "triangle", slideTo: 760 + n * 90 });
      break;
    case "shuffle":
      noise(0.5, { gain: 0.08, from: 400, to: 2400, q: 0.7 });
      [7, 9, 10].forEach((i, k) => bell(PENTA[i], 0.25, { gain: 0.04, parts: 1, delay: 0.3 + k * 0.06, wet: 0.5 }));
      break;
  }
}
