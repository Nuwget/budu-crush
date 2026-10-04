"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type P = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
  speed: number;
  warm: boolean;
  star: boolean;
};

const FRAME_MS = 1000 / 30; // 30 fps is plenty for slow-drifting motes

function glowSprite(rgb: string): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

// One fixed canvas: twinkling stars plus slow warm/lavender motes drawn from
// pre-rendered sprites (no per-frame gradients), at 30 fps, paused when hidden.
export function Motes() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const warm = glowSprite("255,201,138");
    const cool = glowSprite("201,184,255");
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let running = true;
    const dpr = 1; // soft sprites do not need retina resolution
    let particles: P[] = [];

    const make = (): P[] => {
      const small = window.innerWidth < 768;
      const stars = 0; // the Stars layer draws the pixel stars
      const motes = small ? 8 : 16;
      const list: P[] = [];
      for (let i = 0; i < stars + motes; i++) {
        const star = i < stars;
        list.push({
          x: Math.random() * w,
          y: Math.random() * h * (star ? 0.7 : 1),
          r: star ? 1 + Math.random() * 1.2 : 6 + Math.random() * 10,
          vy: star ? 0 : -(0.12 + Math.random() * 0.3),
          vx: star ? 0 : (Math.random() - 0.5) * 0.25,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
          warm: Math.random() > 0.55,
          star,
        });
      }
      return list;
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      particles = make();
    };

    const frame = (t: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (t - last < FRAME_MS) return;
      last = t;
      ctx.clearRect(0, 0, w, h);
      const time = t / 1000;
      for (const p of particles) {
        const tw = 0.5 + 0.5 * Math.sin(time * p.speed + p.phase);
        if (p.star) {
          ctx.globalAlpha = 0.15 + tw * 0.6;
          ctx.fillStyle = "#e2daff";
          ctx.fillRect(p.x, p.y, p.r, p.r);
        } else {
          p.x += p.vx * 2;
          p.y += p.vy * 2;
          if (p.y < -20) {
            p.y = h + 20;
            p.x = Math.random() * w;
          }
          ctx.globalAlpha = 0.07 + tw * 0.22;
          ctx.drawImage(p.warm ? warm : cool, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
      }
      ctx.globalAlpha = 1;
    };

    const onVisibility = () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(frame);
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
