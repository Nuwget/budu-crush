"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type WipeHandle = {
  /** Cover the screen with a mosaic of purple pixels, spreading out from `origin` (0..1). */
  cover: (origin: [number, number], ms: number) => Promise<void>;
  /** Dissolve the mosaic away, again spreading out from `origin`. */
  uncover: (origin: [number, number], ms: number) => Promise<void>;
  /** Cover everything at once (used when arriving from the other language). */
  fill: () => void;
};

const COLS = 26;

/**
 * Pixel-dissolve page transition on one fixed canvas. Cells are painted from a
 * single page-sized gradient, so a fully covered screen looks like a flat purple
 * wall and matches the CSS veil that is shown before JavaScript runs.
 */
export const PixelWipe = forwardRef<WipeHandle>(function PixelWipe(_, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  useImperativeHandle(ref, () => {
    const setup = () => {
      const c = canvas.current!;
      const w = window.innerWidth;
      const h = window.innerHeight;
      c.width = w;
      c.height = h;
      c.style.display = "block";
      const ctx = c.getContext("2d")!;
      const size = Math.ceil(w / COLS);
      const cols = COLS;
      const rows = Math.ceil(h / size);
      const grad = ctx.createLinearGradient(0, 0, w * 0.6, h);
      grad.addColorStop(0, "#4a25c4");
      grad.addColorStop(0.55, "#261064");
      grad.addColorStop(1, "#0d0730");
      return { c, ctx, w, h, size, cols, rows, grad };
    };

    const paint = (g: ReturnType<typeof setup>, x: number, y: number) => {
      g.ctx.fillStyle = g.grad;
      g.ctx.fillRect(x * g.size, y * g.size, g.size, g.size);
      // a little per-cell variation so the mosaic reads as pixels while it moves
      const v = ((x * 7 + y * 13) % 5) / 5;
      g.ctx.fillStyle = `rgba(190,170,255,${0.03 + v * 0.07})`;
      g.ctx.fillRect(x * g.size, y * g.size, g.size, g.size);
    };

    const run = (mode: "cover" | "uncover", origin: [number, number], ms: number) =>
      new Promise<void>((resolve) => {
        cancelAnimationFrame(raf.current);
        const g = setup();
        const cells: { x: number; y: number; at: number; done: boolean }[] = [];
        const ox = origin[0] * g.cols;
        const oy = origin[1] * g.rows;
        let maxD = 0;
        for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) maxD = Math.max(maxD, Math.hypot(x - ox, y - oy));
        for (let y = 0; y < g.rows; y++) {
          for (let x = 0; x < g.cols; x++) {
            const d = Math.hypot(x - ox, y - oy) / maxD;
            cells.push({ x, y, at: (d * 0.68 + Math.random() * 0.3) * ms, done: false });
          }
        }
        if (mode === "uncover") {
          for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) paint(g, x, y);
        }
        const start = performance.now();
        const frame = (now: number) => {
          const t = now - start;
          let left = 0;
          for (const cell of cells) {
            if (cell.done) continue;
            if (t >= cell.at) {
              if (mode === "cover") paint(g, cell.x, cell.y);
              else g.ctx.clearRect(cell.x * g.size, cell.y * g.size, g.size, g.size);
              cell.done = true;
            } else left++;
          }
          if (left > 0) {
            raf.current = requestAnimationFrame(frame);
          } else {
            if (mode === "uncover") g.c.style.display = "none";
            resolve();
          }
        };
        raf.current = requestAnimationFrame(frame);
      });

    return {
      cover: (origin, ms) => run("cover", origin, ms),
      uncover: (origin, ms) => run("uncover", origin, ms),
      fill: () => {
        cancelAnimationFrame(raf.current);
        const g = setup();
        g.ctx.fillStyle = g.grad;
        g.ctx.fillRect(0, 0, g.w, g.h);
      },
    };
  });

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[110] hidden h-full w-full"
    />
  );
});
