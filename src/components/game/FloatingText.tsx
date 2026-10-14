"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { run } from "@/lib/anim";

export interface FloatingTextHandle {
  add(text: string, xPct: number, yPct: number, tier: number, target?: { x: number; y: number } | null, ms?: number): void;
}

const POOL = 8;
const BASE = "translate(-50%, -50%)";
const SPRING = "cubic-bezier(0.2, 1.6, 0.4, 1)";

/**
 * Score numbers that pop and rise. A fixed pool of elements is reused (the oldest is taken
 * when all are busy) and each number is one transform/opacity animation, so a cascade never
 * touches React or the DOM tree. Bigger tiers pop harder and stay a little longer.
 */
export const FloatingText = forwardRef<FloatingTextHandle, { reduce: boolean }>(function FloatingText({ reduce }, ref) {
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const next = useRef(0);
  const count = useRef(0);
  const layer = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      add(text, x, y, tier, target, ms = 420) {
        const i = next.current;
        next.current = (i + 1) % POOL;
        const el = els.current[i];
        if (!el) return;
        el.textContent = text;
        el.className = `floater tier-${tier}`;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        if (reduce) {
          run(el, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 700, fill: "both" });
          return;
        }
        // a little sideways drift that alternates, so neighbouring numbers do not stack
        const dx = (count.current++ % 2 ? 1 : -1) * (4 + tier * 3);
        const rise = 26 + tier * 6;
        const peak = 1.12 + tier * 0.07;
        const pop = { opacity: 1, transform: `${BASE} translate(${dx * 0.3}px, -6px) scale(${peak})`, offset: tier ? 0.14 : 0.2, easing: SPRING };
        const from = { opacity: 0, transform: `${BASE} translate(0px, 6px) scale(0.4)`, offset: 0 };
        const box = layer.current?.getBoundingClientRect();
        if (target && box) {
          // the number is born at the match, hangs for a beat, then accelerates into the score: points that are paid, not just shown
          const fx = target.x - (box.left + (x / 100) * box.width);
          const fy = target.y - (box.top + (y / 100) * box.height);
          run(el, 
            [
              from,
              pop,
              { opacity: 1, transform: `${BASE} translate(${dx * 0.6}px, -${rise * 0.5}px) scale(1)`, offset: 0.36, easing: "linear" },
              { opacity: 1, transform: `${BASE} translate(${dx * 0.7}px, -${rise * 0.55}px) scale(1)`, offset: 0.46, easing: "cubic-bezier(0.55, 0, 0.85, 0.4)" },
              { opacity: 1, transform: `${BASE} translate(${fx * 0.9}px, ${fy * 0.9}px) scale(0.7)`, offset: 0.94 },
              { opacity: 0, transform: `${BASE} translate(${fx}px, ${fy}px) scale(0.5)`, offset: 1 },
            ],
            { duration: ms, easing: "linear", fill: "both" },
          );
          return;
        }
        run(el, 
          [
            from,
            pop,
            { opacity: 1, transform: `${BASE} translate(${dx * 0.6}px, -${rise * 0.4}px) scale(1)`, offset: 0.45, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
            { opacity: 0, transform: `${BASE} translate(${dx}px, -${rise}px) scale(0.94)`, offset: 1 },
          ],
          { duration: 760 + tier * 70, easing: "linear", fill: "both" },
        );
      },
    }),
    [reduce],
  );

  return (
    <div className="floaters" aria-hidden="true" ref={layer}>
      {Array.from({ length: POOL }, (_, i) => (
        <span
          key={i}
          className="floater"
          ref={(n) => {
            els.current[i] = n;
          }}
        />
      ))}
    </div>
  );
});
