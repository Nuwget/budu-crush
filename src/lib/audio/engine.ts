// A small Web Audio graph built for short, soft, musical sounds on a phone:
//
//   voices -> sfx / music bus -> master -> warmth (high shelf) -> compressor -> destination
//   voices -> wet send -> convolver (a synthesized room, built once, off the gesture) -> master
//
// The context can only start inside a user gesture, so everything tolerates "not unlocked yet" by doing nothing.
// Cost control: one shared noise buffer (no allocation per sound), a hard cap on simultaneous voices, and
// nothing is created until the first tap.

export interface Buses {
  ctx: AudioContext;
  sfx: GainNode;
  music: GainNode;
  wet: GainNode;
}

let buses: Buses | null = null;
let wantMusic = true;
let wantSfx = true;
let noiseBuf: AudioBuffer | null = null;
let noiseCount = 0;
let active = 0;

/** Simultaneous oscillators/noise sources allowed. A cascade stays under this; the extras are the quietest layers. */
const MAX_VOICES = 44;

type ACtor = typeof AudioContext;

/** A deterministic generator: the sounds must be the same every time and nothing may read Math.random. */
function lcg(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return s / 2147483648;
  };
}

/** A short, warm, dark room: decaying noise through a gentle low-pass, slightly different per ear. */
function buildRoom(ctx: AudioContext): AudioBuffer {
  const sec = 1.1;
  const len = Math.floor(ctx.sampleRate * sec);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    const rnd = lcg(9001 + ch * 77);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (rnd() - lp) * (0.55 - 0.45 * t); // the tail gets darker as it fades
      d[i] = lp * Math.pow(1 - t, 2.4) * (i < 90 ? i / 90 : 1);
    }
  }
  return ir;
}

/** Create (once) and resume the context. Call from a pointer or key handler. */
export function unlockAudio(): Buses | null {
  if (typeof window === "undefined") return null;
  if (!buses) {
    const AC: ACtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC({ latencyHint: "interactive" });
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const warmth = ctx.createBiquadFilter();
    warmth.type = "highshelf";
    warmth.frequency.value = 5200;
    warmth.gain.value = -4;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master.connect(warmth).connect(comp).connect(ctx.destination);
    const sfx = ctx.createGain();
    const music = ctx.createGain();
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    sfx.connect(master);
    music.connect(master);
    const room = ctx.createConvolver();
    wet.connect(room).connect(master);
    buses = { ctx, sfx, music, wet };
    applyGains();
    // the room (about 100k samples) and the shared noise are built a moment after the gesture, never inside it
    window.setTimeout(() => {
      if (!buses) return;
      room.buffer = buildRoom(ctx);
      sharedNoise(ctx);
    }, 120);
    document.addEventListener("visibilitychange", () => {
      if (!buses) return;
      if (document.hidden) buses.ctx.suspend().catch(() => {});
      else buses.ctx.resume().catch(() => {});
    });
  }
  if (buses.ctx.state === "suspended") buses.ctx.resume().catch(() => {});
  return buses;
}

export const getBuses = () => buses;

function applyGains() {
  if (!buses) return;
  const t = buses.ctx.currentTime;
  buses.sfx.gain.cancelScheduledValues(t);
  buses.sfx.gain.setTargetAtTime(wantSfx ? 1 : 0, t, 0.05);
  buses.music.gain.cancelScheduledValues(t);
  buses.music.gain.setTargetAtTime(wantMusic ? 0.5 : 0, t, 0.4);
}

/** Let the music step back for a big moment and come back after it: silence makes the next sound louder. */
export function duckMusic(depth = 0.3, hold = 0.5, release = 0.7) {
  if (!buses || !wantMusic) return;
  const t = buses.ctx.currentTime;
  const g = buses.music.gain;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(0.5 * depth, t, 0.04);
  g.setTargetAtTime(0.5, t + hold, release / 3);
}

export function setAudioEnabled(music: boolean, sfx: boolean) {
  wantMusic = music;
  wantSfx = sfx;
  applyGains();
}

export const isMusicWanted = () => wantMusic;
export const isSfxWanted = () => wantSfx;

/** Seconds of audio clock; 0 before the first tap. */
export const audioNow = () => buses?.ctx.currentTime ?? 0;

/** Priority 0 sounds (sparkles, ticks) are dropped first when the mix is crowded; 2 always plays. */
export type Priority = 0 | 1 | 2;

function admit(p: Priority, cost: number): boolean {
  if (p === 2) return true;
  const room = p === 0 ? MAX_VOICES * 0.6 : MAX_VOICES;
  return active + cost <= room;
}

function track(node: AudioScheduledSourceNode) {
  active++;
  node.onended = () => {
    active--;
    node.disconnect();
  };
}

export interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  slideTo?: number;
  delay?: number;
  bus?: "sfx" | "music";
  lowpass?: number;
  /** 0..1: how much of this voice also goes to the room. */
  wet?: number;
  priority?: Priority;
}

function send(b: Buses, node: AudioNode, o: { bus?: "sfx" | "music"; wet?: number }) {
  node.connect(o.bus === "music" ? b.music : b.sfx);
  if (o.wet) {
    const w = b.ctx.createGain();
    w.gain.value = o.wet;
    node.connect(w).connect(b.wet);
  }
}

/** One enveloped oscillator note. */
export function tone(freq: number, dur: number, o: ToneOptions = {}) {
  const b = buses;
  if (!b || !admit(o.priority ?? 1, 1)) return;
  const { ctx } = b;
  const t = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
  const g = ctx.createGain();
  const peak = o.gain ?? 0.2;
  const attack = o.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.lowpass;
    osc.connect(lp);
    node = lp;
  }
  node.connect(g);
  send(b, g, o);
  track(osc);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export interface BellOptions {
  gain?: number;
  delay?: number;
  wet?: number;
  /** 1 = a plain sine; 2 and 3 add the soft overtones that make it sound struck rather than synthesized. */
  parts?: 1 | 2 | 3;
  priority?: Priority;
  attack?: number;
}

// Partial ratio, relative level, relative length. Harmonic, so every chord stays consonant.
const PARTIALS: [number, number, number][] = [
  [1, 1, 1],
  [2, 0.26, 0.55],
  [3, 0.09, 0.3],
];

/** A struck, mallet-like note: a sine with fast-fading overtones. The basic voice of the game. */
export function bell(freq: number, dur: number, o: BellOptions = {}) {
  const b = buses;
  const parts = o.parts ?? 3;
  if (!b || !admit(o.priority ?? 1, parts)) return;
  const { ctx } = b;
  const t = ctx.currentTime + (o.delay ?? 0);
  const peak = o.gain ?? 0.15;
  const out = ctx.createGain();
  out.gain.value = 1;
  for (let i = 0; i < parts; i++) {
    const [ratio, level, len] = PARTIALS[i];
    const f = freq * ratio;
    if (f > 9000) continue;
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    const g = ctx.createGain();
    const d = dur * len;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak * level, t + (o.attack ?? 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(out);
    track(osc);
    osc.start(t);
    osc.stop(t + d + 0.04);
  }
  send(b, out, o);
}

function sharedNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const rnd = lcg(12345);
  for (let i = 0; i < len; i++) data[i] = rnd();
  noiseBuf = buf;
  return buf;
}

export interface NoiseOptions {
  gain?: number;
  from?: number;
  to?: number;
  delay?: number;
  type?: BiquadFilterType;
  q?: number;
  /** Fade the sound in over this long instead of striking it (a swell). */
  swell?: number;
  wet?: number;
  priority?: Priority;
}

/** A short filtered noise burst (taps, whooshes, shimmer), cut from one shared buffer at a different place each time. */
export function noise(dur: number, o: NoiseOptions = {}) {
  const b = buses;
  if (!b || !admit(o.priority ?? 1, 1)) return;
  const { ctx } = b;
  const buf = sharedNoise(ctx);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const offset = ((noiseCount++ * 0.37) % 1.6) + 0;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  if (o.q) f.Q.value = o.q;
  const t = ctx.currentTime + (o.delay ?? 0);
  f.frequency.setValueAtTime(o.from ?? 800, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = ctx.createGain();
  const peak = o.gain ?? 0.15;
  if (o.swell) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + o.swell);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  } else {
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  src.connect(f).connect(g);
  send(b, g, o);
  track(src);
  src.start(t, offset, dur + 0.02);
}
