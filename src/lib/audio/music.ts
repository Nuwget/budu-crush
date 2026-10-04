import { getBuses, tone } from "./engine.ts";

export type MusicMood = "calm" | "play";

// Am - F - C - G, one bar each. A soft pad plus a pentatonic arpeggio; fully deterministic.
const BARS: { pad: number[]; arp: number[] }[] = [
  { pad: [110, 164.81, 220], arp: [440, 523.25, 659.25, 523.25] },
  { pad: [87.31, 130.81, 174.61], arp: [349.23, 440, 523.25, 440] },
  { pad: [130.81, 196, 261.63], arp: [392, 523.25, 659.25, 523.25] },
  { pad: [98, 146.83, 196], arp: [392, 493.88, 587.33, 493.88] },
];

const BEAT = 60 / 68;
let timer = 0;
let nextTime = 0;
let beat = 0;
let mood: MusicMood = "calm";
let running = false;

function schedule() {
  const b = getBuses();
  if (!b) return;
  const { ctx } = b;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.6) {
    const bar = BARS[Math.floor(beat / 4) % BARS.length];
    const inBar = beat % 4;
    const delay = nextTime - ctx.currentTime;
    if (inBar === 0) for (const f of bar.pad) tone(f, BEAT * 4.2, { type: "triangle", gain: 0.05, attack: 0.8, bus: "music", delay, lowpass: 900 });
    const every = mood === "play" ? 1 : 2;
    if (inBar % every === 0) tone(bar.arp[inBar], BEAT * 1.6, { gain: mood === "play" ? 0.045 : 0.035, bus: "music", delay, lowpass: 2400 });
    nextTime += BEAT;
    beat++;
  }
}

export function startMusic(m: MusicMood = "calm") {
  mood = m;
  if (running || !getBuses()) return;
  running = true;
  timer = window.setInterval(schedule, 120);
  schedule();
}

export function setMusicMood(m: MusicMood) {
  mood = m;
}

export function stopMusic() {
  running = false;
  window.clearInterval(timer);
}
