"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface ParticleHandle {
  /** A puff of pixel sparks at viewport coordinates. */
  burst(x: number, y: number, color: string, count: number): void;
  /** An expanding ring (specials, big combos). */
  ring(x: number, y: number, color: string, size: number): void;
  /** A fading band across the board (line clearers). */
  beam(x: number, y: number, horizontal: boolean, length: number, color: string): void;
  /** Falling pixel confetti from the top of the screen. */
  confetti(count: number): void;
}

const MAX = 200;
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
}
interface Ring {
  x: number;
  y: number;
  size: number;
  life: number;
  color: string;
}
interface Beam {
  x: number;
  y: number;
  h: boolean;
  len: number;
  life: number;
  color: string;
}

/**
 * One full-screen canvas for every spark. Particles live in a fixed-size pool (the oldest
 * is recycled when it is full) and the loop only runs while something is alive, so an idle
 * board costs nothing. Pixel-square sparks keep the art style.
 */
export const ParticleCanvas = forwardRef<ParticleHandle, { reduce?: boolean }>(function ParticleCanvas({ reduce = false }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    parts: [] as P[],
    rings: [] as Ring[],
    beams: [] as Beam[],
    raf: 0,
    last: 0,
    dpr: 1,
    w: 0,
    h: 0,
    cap: MAX,
  });
  const loopRef = useRef<(t: number) => void>(() => {});

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

      for (const b of s.beams) {
        b.life -= dt * 3.2;
        if (b.life <= 0) continue;
        ctx.globalAlpha = Math.min(1, b.life) * 0.75;
        ctx.fillStyle = b.color;
        const thick = 10 * b.life + 4;
        if (b.h) ctx.fillRect(b.x - b.len / 2, b.y - thick / 2, b.len, thick);
        else ctx.fillRect(b.x - thick / 2, b.y - b.len / 2, thick, b.len);
      }
      s.beams = s.beams.filter((b) => b.life > 0);

      for (const r of s.rings) {
        r.life -= dt * 2.4;
        if (r.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, r.life);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3 + r.life * 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size * (1.4 - r.life), 0, Math.PI * 2);
        ctx.stroke();
      }
      s.rings = s.rings.filter((r) => r.life > 0);

      for (const p of s.parts) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, (p.life / p.max) * 1.6));
        ctx.fillStyle = p.color;
        const sz = Math.round(p.size);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
      }
      s.parts = s.parts.filter((p) => p.life > 0);
      ctx.globalAlpha = 1;

      if (s.parts.length || s.rings.length || s.beams.length) s.raf = requestAnimationFrame(loopRef.current);
      else {
        s.raf = 0;
        ctx.clearRect(0, 0, s.w, s.h);
      }
    };
    loopRef.current = loop;
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
    const push = (p: P) => {
      if (s.parts.length >= s.cap) s.parts.shift();
      s.parts.push(p);
    };
    return {
      burst(x, y, color, count) {
        if (reduce) return;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + i * 0.7;
          const sp = 60 + ((i * 53) % 90);
          push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.45 + ((i * 17) % 30) / 100, max: 0.7, size: 2 + (i % 3), color: i % 4 === 0 ? "#ffffff" : color, g: 260 });
        }
        wake();
      },
      ring(x, y, color, size) {
        if (reduce) return;
        s.rings.push({ x, y, size, life: 1, color });
        wake();
      },
      beam(x, y, horizontal, length, color) {
        if (reduce) return;
        s.beams.push({ x, y, h: horizontal, len: length, life: 1, color });
        wake();
      },
      confetti(count) {
        if (reduce) return;
        for (let i = 0; i < count; i++) {
          push({
            x: ((i * 97) % 100) * (s.w / 100),
            y: -10 - ((i * 31) % 120),
            vx: -30 + ((i * 41) % 60),
            vy: 60 + ((i * 29) % 90),
            life: 2.4 + ((i * 13) % 14) / 10,
            max: 3,
            size: 3 + (i % 3),
            color: CONFETTI[i % CONFETTI.length],
            g: 40,
          });
        }
        wake();
      },
    };
  }, [reduce]);

  return <canvas ref={canvas} aria-hidden="true" className="particles" />;
});
