"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; s: number; phase: number; speed: number; warm: boolean };
type Shooter = { x: number; y: number; vx: number; vy: number; life: number };

// Twinkling pixel stars, now and then a shooting star, and a few drifting fireflies.
export function Stars({ active, still = false }: { active: boolean; still?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let flies: { x: number; y: number; vx: number; vy: number; phase: number }[] = [];
    const shooters: Shooter[] = [];
    let nextShot = 1500;
    let last = 0;
    let raf = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const n = Math.round((w * h) / 9000);
      stars = Array.from({ length: n }, () => ({
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h * 0.78),
        s: Math.random() > 0.85 ? 3 : 2,
        phase: Math.random() * 6.28,
        speed: 0.6 + Math.random() * 2,
        warm: Math.random() > 0.8,
      }));
      flies = Array.from({ length: w < 700 ? 8 : 16 }, () => ({
        x: Math.random() * w,
        y: h * (0.4 + Math.random() * 0.55),
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.25,
        phase: Math.random() * 6.28,
      }));
    };

    const frame = (now: number) => {
      if (!still) raf = requestAnimationFrame(frame);
      if (!activeRef.current || document.hidden || now - last < 33) return;
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(now / 1000 * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.warm ? "#ffd9a8" : "#ece6ff";
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }

      if (now > nextShot) {
        nextShot = now + 3500 + Math.random() * 4500;
        shooters.push({
          x: w * (0.15 + Math.random() * 0.7),
          y: h * (0.05 + Math.random() * 0.25),
          vx: 9 + Math.random() * 5,
          vy: 4 + Math.random() * 3,
          life: 1,
        });
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 0.022;
        if (sh.life <= 0) {
          shooters.splice(i, 1);
          continue;
        }
        for (let k = 0; k < 14; k++) {
          ctx.globalAlpha = Math.max(0, sh.life * (1 - k / 14));
          ctx.fillStyle = k < 2 ? "#ffffff" : "#c9b8ff";
          const px = Math.round((sh.x - sh.vx * k * 0.7) / 3) * 3;
          const py = Math.round((sh.y - sh.vy * k * 0.7) / 3) * 3;
          ctx.fillRect(px, py, 3, 3);
        }
      }

      for (const f of flies) {
        f.x += f.vx;
        f.y += f.vy;
        if (f.y < -10) {
          f.y = h + 10;
          f.x = Math.random() * w;
        }
        ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(now / 700 + f.phase));
        ctx.fillStyle = "#ffc98a";
        ctx.fillRect(Math.round(f.x), Math.round(f.y), 3, 3);
      }
      ctx.globalAlpha = 1;
    };

    // reduced motion: draw the stars once (and again on resize), no loop
    const redraw = () => {
      resize();
      if (still) frame(1000);
    };
    redraw();
    if (!still) raf = requestAnimationFrame(frame);
    window.addEventListener("resize", redraw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", redraw);
    };
  }, [still]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
