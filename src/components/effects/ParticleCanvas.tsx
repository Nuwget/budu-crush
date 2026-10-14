"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface ParticleHandle {
  /** A puff of pixel sparks at viewport coordinates. */
  burst(x: number, y: number, color: string, count: number): void;
  /** Little four-point glints that hang in the air and fade (praise, stars). */
  sparkle(x: number, y: number, color: string, count: number, spread?: number): void;
  /** An expanding ring (specials, big combos). */
  ring(x: number, y: number, color: string, size: number): void;
  /** A fading band across the board (line clearers). */
  beam(x: number, y: number, horizontal: boolean, length: number, color: string): void;
  /** Falling pixel confetti from the top of the screen. */
  confetti(count: number): void;
  /** Orbs that arc from one point to another (points flying to the score). `done` fires on arrival. */
  fly(x0: number, y0: number, x1: number, y1: number, color: string, count: number, done?: () => void): void;
}

const MAX = 200;
const MAX_RINGS = 12;
const MAX_ORBS = 24;
const CONFETTI = ["#ffe3a0", "#ff6fb1", "#4fe0d0", "#b68fff", "#ffc83d", "#ffffff"];

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  g: number;
  /** 0 pixel square · 1 four-point glint. */
  shape: 0 | 1;
}
interface Ring {
  x: number;
  y: number;
  size: number;
  life: number;
  color: string;
  beam: boolean;
  h: boolean;
  len: number;
}
interface Orb {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  t: number;
  speed: number;
  color: string;
  live: boolean;
  done?: () => void;
}

const free = (): P => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: "#fff", g: 0, shape: 0 });

/**
 * One full-screen canvas for every spark. Everything lives in fixed pools that are reused
 * (nothing is allocated while a cascade plays, so no garbage collection mid-combo), and the
 * loop only runs while something is alive: an idle board costs nothing. Pixel-square sparks
 * keep the art style; the glints and orbs add the "magic" without any blur or shadow.
 */
export const ParticleCanvas = forwardRef<ParticleHandle, { reduce?: boolean }>(function ParticleCanvas({ reduce = false }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    parts: Array.from({ length: MAX }, free),
    cursor: 0,
    rings: Array.from({ length: MAX_RINGS }, (): Ring => ({ x: 0, y: 0, size: 0, life: 0, color: "#fff", beam: false, h: true, len: 0 })),
    orbs: Array.from({ length: MAX_ORBS }, (): Orb => ({ x0: 0, y0: 0, cx: 0, cy: 0, x1: 0, y1: 0, t: 0, speed: 1, color: "#fff", live: false })),
    raf: 0,
    last: 0,
    dpr: 1,
    w: 0,
    h: 0,
    cap: MAX,
  });
  const loopRef = useRef<(t: number) => void>(() => {});
  const spawnRef = useRef<(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, g: number, shape: 0 | 1) => void>(() => {});

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const s = state.current;
    s.cap = (navigator.hardwareConcurrency ?? 8) <= 4 ? 110 : MAX;
    const resize = () => {
      s.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      s.w = window.innerWidth;
      s.h = window.innerHeight;
      c.width = Math.round(s.w * s.dpr);
      c.height = Math.round(s.h * s.dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - s.last) / 1000 || 0.016);
      s.last = t;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      let alive = 0;

      for (const r of s.rings) {
        if (r.life <= 0) continue;
        alive++;
        if (r.beam) {
          r.life -= dt * 3.2;
          if (r.life <= 0) continue;
          ctx.globalAlpha = Math.min(1, r.life) * 0.75;
          ctx.fillStyle = r.color;
          const thick = 10 * r.life + 4;
          if (r.h) ctx.fillRect(r.x - r.len / 2, r.y - thick / 2, r.len, thick);
          else ctx.fillRect(r.x - thick / 2, r.y - r.len / 2, thick, r.len);
        } else {
          r.life -= dt * 2.4;
          if (r.life <= 0) continue;
          ctx.globalAlpha = Math.max(0, r.life);
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 3 + r.life * 3;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.size * (1.4 - r.life), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      for (const p of s.parts) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) continue;
        alive++;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          const sz = Math.round(p.size);
          ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
        } else {
          // a plus-shaped glint that swells then thins
          const a = p.size * Math.sin(Math.PI * Math.min(1, k)) + 1;
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          ctx.fillRect(x - a, y - 1, a * 2 + 1, 2);
          ctx.fillRect(x - 1, y - a, 2, a * 2 + 1);
        }
      }

      for (const o of s.orbs) {
        if (!o.live) continue;
        alive++;
        o.t += dt * o.speed;
        if (o.t < 0) continue;
        if (o.t >= 1) {
          o.live = false;
          // a tiny pop where it lands
          const x = o.x1;
          const y = o.y1;
          for (let i = 0; i < 3; i++) spawn(x, y, (i - 1) * 40, -50 - i * 14, 0.28, 2, o.color, 120, 0);
          o.done?.();
          o.done = undefined;
          continue;
        }
        for (let k = 0; k < 3; k++) {
          const u = Math.max(0, o.t - k * 0.045);
          const iu = 1 - u;
          const x = iu * iu * o.x0 + 2 * iu * u * o.cx + u * u * o.x1;
          const y = iu * iu * o.y0 + 2 * iu * u * o.cy + u * u * o.y1;
          ctx.globalAlpha = k === 0 ? 1 : 0.5 - k * 0.2;
          ctx.fillStyle = k === 0 ? "#ffffff" : o.color;
          const sz = k === 0 ? 5 : 4 - k;
          ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
        }
      }
      ctx.globalAlpha = 1;

      if (alive) s.raf = requestAnimationFrame(loopRef.current);
      else {
        s.raf = 0;
        ctx.clearRect(0, 0, s.w, s.h);
      }
    };
    loopRef.current = loop;

    function spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, g: number, shape: 0 | 1) {
      // reuse the slot under the cursor: a dead one, or the oldest when the pool is full
      const p = s.parts[s.cursor];
      s.cursor = (s.cursor + 1) % s.cap;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.max = life;
      p.size = size;
      p.color = color;
      p.g = g;
      p.shape = shape;
    }
    spawnRef.current = spawn;
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, []);

  useImperativeHandle(ref, () => {
    const s = state.current;
    const wake = () => {
      if (!s.raf) {
        s.last = performance.now();
        s.raf = requestAnimationFrame(loopRef.current);
      }
    };
    const addRing = (r: Partial<Ring>) => {
      const slot = s.rings.find((x) => x.life <= 0) ?? s.rings[0];
      Object.assign(slot, { beam: false, h: true, len: 0, size: 0, ...r, life: 1 });
    };
    return {
      burst(x, y, color, count) {
        if (reduce) return;
        const spawn = spawnRef.current;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + i * 0.7;
          const sp = 60 + ((i * 53) % 90);
          spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.45 + ((i * 17) % 30) / 100, 2 + (i % 3), i % 4 === 0 ? "#ffffff" : color, 260, 0);
        }
        wake();
      },
      sparkle(x, y, color, count, spread = 34) {
        if (reduce) return;
        const spawn = spawnRef.current;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + i * 1.3;
          const d = spread * (0.5 + ((i * 37) % 50) / 60);
          spawn(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, Math.cos(a) * 14, -18 - ((i * 11) % 14), 0.55 + ((i * 23) % 40) / 100, 3 + (i % 3), i % 3 === 0 ? "#ffffff" : color, -10, 1);
        }
        wake();
      },
      ring(x, y, color, size) {
        if (reduce) return;
        addRing({ x, y, color, size });
        wake();
      },
      beam(x, y, horizontal, length, color) {
        if (reduce) return;
        addRing({ x, y, color, beam: true, h: horizontal, len: length });
        wake();
      },
      confetti(count) {
        if (reduce) return;
        const spawn = spawnRef.current;
        for (let i = 0; i < count; i++) {
          spawn(((i * 97) % 100) * (s.w / 100), -10 - ((i * 31) % 120), -30 + ((i * 41) % 60), 60 + ((i * 29) % 90), 2.4 + ((i * 13) % 14) / 10, 3 + (i % 3), CONFETTI[i % CONFETTI.length], 40, 0);
        }
        wake();
      },
      fly(x0, y0, x1, y1, color, count, done) {
        if (reduce) {
          done?.();
          return;
        }
        for (let i = 0; i < count; i++) {
          const o = s.orbs.find((q) => !q.live);
          if (!o) break;
          const side = i % 2 ? 1 : -1;
          o.x0 = x0;
          o.y0 = y0;
          o.x1 = x1;
          o.y1 = y1;
          // the control point bows the path sideways so the orbs arc instead of running a straight line
          o.cx = (x0 + x1) / 2 + side * (40 + i * 14);
          o.cy = Math.min(y0, y1) - 30 - i * 8;
          o.t = -i * 0.07;
          o.speed = 1.9;
          o.color = color;
          o.live = true;
          o.done = i === count - 1 ? done : undefined;
        }
        wake();
      },
    };
  }, [reduce]);

  return <canvas ref={canvas} aria-hidden="true" className="particles" />;
});
