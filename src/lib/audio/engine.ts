// A tiny Web Audio graph: master -> compressor -> destination, with separate music and
// sfx buses. The context can only start inside a user gesture, so everything tolerates
// "not unlocked yet" by doing nothing.

export interface Buses {
  ctx: AudioContext;
  sfx: GainNode;
  music: GainNode;
}

let buses: Buses | null = null;
let wantMusic = true;
let wantSfx = true;

type ACtor = typeof AudioContext;

/** Create (once) and resume the context. Call from a pointer or key handler. */
export function unlockAudio(): Buses | null {
  if (typeof window === "undefined") return null;
  if (!buses) {
    const AC: ACtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    const sfx = ctx.createGain();
    const music = ctx.createGain();
    sfx.connect(master);
    music.connect(master);
    buses = { ctx, sfx, music };
    applyGains();
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

export function setAudioEnabled(music: boolean, sfx: boolean) {
  wantMusic = music;
  wantSfx = sfx;
  applyGains();
}

export const isMusicWanted = () => wantMusic;

export interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  slideTo?: number;
  delay?: number;
  bus?: "sfx" | "music";
  lowpass?: number;
}

/** One enveloped oscillator note. */
export function tone(freq: number, dur: number, o: ToneOptions = {}) {
  const b = buses;
  if (!b) return;
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
  node.connect(g).connect(o.bus === "music" ? b.music : b.sfx);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A short filtered noise burst (whooshes, thumps). The buffer is a fixed pseudo-noise, not random. */
export function noise(dur: number, o: { gain?: number; from?: number; to?: number; delay?: number; type?: BiquadFilterType } = {}) {
  const b = buses;
  if (!b) return;
  const { ctx } = b;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < len; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    data[i] = (seed / 2147483648) * Math.pow(1 - i / len, 1.6);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  const t = ctx.currentTime + (o.delay ?? 0);
  f.frequency.setValueAtTime(o.from ?? 800, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(b.sfx);
  src.start(t);
}
