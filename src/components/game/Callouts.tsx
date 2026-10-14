"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { add, run, stop } from "@/lib/anim";

export interface CalloutsHandle {
  /** Show a word at a position (percent of the board). Returns false if it was held back. */
  show(text: string, level: number, xPct: number, yPct: number): boolean;
  /** Where the last word ended up (percent of the board), after keeping it inside the edges. */
  lastAt(): { x: number; y: number };
}

const BASE = "translate(-50%, -50%)";
const SPRING = "cubic-bezier(0.2, 1.6, 0.4, 1)";
const OUT = "cubic-bezier(0.2, 0.7, 0.3, 1)";
const IN = "cubic-bezier(0.5, 0, 0.9, 0.5)";
const POOL = 3;
const LETTERS = 18;
/** A weaker word never cuts off a stronger one that is still fresh. */
const HOLD_MS = 420;

const tf = (y = 0, s = 1, rot = 0, x = 0) => `${BASE} translate(${x}px, ${y}px) rotate(${rot}deg) scale(${s})`;

/**
 * Each tier of praise has its own weight: the soft ones pop and float away, the big ones
 * hit harder, overshoot further, shake a hair and linger. `duration` is deliberately short:
 * a word is a reaction, not a cutscene.
 */
function tiers(level: number): { duration: number; frames: Keyframe[] } {
  switch (level) {
    case 1: // "Delícia!": a soft pop that settles, a little float, a fade
      return {
        duration: 760,
        frames: [
          { opacity: 0, transform: tf(6, 0.5, -3), offset: 0 },
          { opacity: 1, transform: tf(-2, 1.08, 1), offset: 0.2, easing: SPRING },
          { opacity: 1, transform: tf(-3, 0.97, 0), offset: 0.32 },
          { opacity: 1, transform: tf(-5, 1, 0), offset: 0.44 },
          { opacity: 1, transform: tf(-12, 1, 0), offset: 0.74, easing: IN },
          { opacity: 0, transform: tf(-24, 0.97, 0), offset: 1 },
        ],
      };
    case 2:
      return {
        duration: 860,
        frames: [
          { opacity: 0, transform: tf(8, 0.4, -5), offset: 0 },
          { opacity: 1, transform: tf(-3, 1.18, 2), offset: 0.18, easing: SPRING },
          { opacity: 1, transform: tf(-5, 0.96, -1), offset: 0.3 },
          { opacity: 1, transform: tf(-7, 1.02, 0), offset: 0.44 },
          { opacity: 1, transform: tf(-11, 1, 0), offset: 0.74, easing: IN },
          { opacity: 0, transform: tf(-28, 1.04, 0), offset: 1 },
        ],
      };
    case 3:
      return {
        duration: 980,
        frames: [
          { opacity: 0, transform: tf(10, 0.3, -7), offset: 0 },
          { opacity: 1, transform: tf(-3, 1.18, 2), offset: 0.15, easing: OUT },
          { opacity: 1, transform: tf(-4, 1, -1.5, -2), offset: 0.26 },
          { opacity: 1, transform: tf(-4, 1.05, 1, 2), offset: 0.33 },
          { opacity: 1, transform: tf(-6, 1.02, 0, 0), offset: 0.42 },
          { opacity: 1, transform: tf(-11, 1, 0), offset: 0.76, easing: IN },
          { opacity: 0, transform: tf(-32, 1.08, 0), offset: 1 },
        ],
      };
    default:
      return {
        duration: 1180,
        frames: [
          { opacity: 0, transform: tf(12, 0.2, -9), offset: 0 },
          { opacity: 1, transform: tf(-4, 1.2, 3), offset: 0.13, easing: OUT },
          { opacity: 1, transform: tf(-4, 1, -2, -3), offset: 0.22 },
          { opacity: 1, transform: tf(-4, 1.07, 2, 3), offset: 0.29 },
          { opacity: 1, transform: tf(-5, 1.02, -1, -2), offset: 0.36 },
          { opacity: 1, transform: tf(-7, 1.08, 0), offset: 0.5, easing: OUT },
          { opacity: 1, transform: tf(-9, 1.04, 0), offset: 0.62 },
          { opacity: 1, transform: tf(-14, 1.04, 0), offset: 0.8, easing: IN },
          { opacity: 0, transform: tf(-36, 1.12, 0), offset: 1 },
        ],
      };
  }
}

/**
 * The words of praise. A tiny pool of elements is created once and reused, and each word is
 * one Web Animation on transform and opacity: nothing is added to or removed from the DOM
 * and React never re-renders while a cascade plays.
 */
export const Callouts = forwardRef<CalloutsHandle, { reduce: boolean }>(function Callouts({ reduce }, ref) {
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const next = useRef(0);
  const last = useRef({ level: -1, at: 0, el: -1 });
  const root = useRef<HTMLDivElement>(null);
  const at = useRef({ x: 50, y: 50 });
  // measured once per word and tier, not once per showing: reading widths forces a layout in the middle of a cascade
  const fit = useRef(new Map<string, { font: string; half: number }>());
  useEffect(() => {
    const clear = () => fit.current.clear();
    window.addEventListener("resize", clear);
    return () => window.removeEventListener("resize", clear);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      lastAt: () => at.current,
      show(text, level, x, y) {
        const now = performance.now();
        const l = last.current;
        if (l.level > level && now - l.at < HOLD_MS) return false;
        const prev = els.current[l.el];
        const i = next.current;
        next.current = (i + 1) % POOL;
        const el = els.current[i];
        if (!el) return false;
        stop(el);
        for (let k = 0; k < LETTERS; k++) stop(el.children[k]);
        el.className = `callout co-${level}`;
        const letters = el.children;
        const chars = [...text].slice(0, LETTERS);
        for (let k = 0; k < LETTERS; k++) {
          const li = letters[k] as HTMLElement;
          li.textContent = k < chars.length ? (chars[k] === " " ? "\u00A0" : chars[k]) : "";
          li.style.display = k < chars.length ? "" : "none";
        }
        // keep the whole word (at its overshoot size) inside the board, whatever its length, and never wider than ~58% of it
        const box = root.current;
        const key = `${level}|${text}`;
        let f = fit.current.get(key);
        if (!f && box && box.offsetWidth) {
          el.style.fontSize = "";
          const cap = box.offsetWidth * 0.58;
          let font = "";
          if (el.offsetWidth > cap) font = `${(parseFloat(getComputedStyle(el).fontSize) * cap) / el.offsetWidth}px`;
          el.style.fontSize = font;
          f = { font, half: ((el.offsetWidth * (1 + level * 0.06)) / 2 / box.offsetWidth) * 100 + 2 };
          fit.current.set(key, f);
        }
        if (f) {
          el.style.fontSize = f.font;
          x = Math.min(100 - f.half, Math.max(f.half, x));
        }
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        // a weaker (or equal) word never lands on top of a fresh one: the stronger word keeps the stage
        if (prev && l.level >= level && now - l.at < HOLD_MS * 2.2) {
          const a = prev.getBoundingClientRect();
          const b2 = el.getBoundingClientRect();
          if (a.left < b2.right && a.right > b2.left && a.top < b2.bottom && a.bottom > b2.top) return false;
        }
        // the previous word steps aside quickly, from wherever it currently is: a fade with an implicit start
        // value rides on top of its running animation, so nothing has to be read back from the page
        if (prev && now - l.at < 1400) add(prev, [{ opacity: 0 }], { duration: 130, fill: "forwards" });
        at.current = { x, y };
        if (reduce) run(el, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 800, fill: "both" });
        else {
          const t = tiers(level);
          run(el, t.frames, { duration: t.duration, easing: "linear", fill: "both" });
          // the big words are spelled out: each letter pops in a hair after the one before it
          if (level >= 4)
            for (let k = 0; k < chars.length; k++)
              add(letters[k],
                [
                  { transform: "translateY(16px) scale(0.2) rotate(-14deg)", opacity: 0, offset: 0 },
                  { transform: "translateY(-5px) scale(1.3) rotate(4deg)", opacity: 1, offset: 0.6, easing: SPRING },
                  { transform: "translateY(0) scale(1) rotate(0deg)", opacity: 1, offset: 1 },
                ],
                { duration: 340, delay: k * (level >= 4 ? 24 : 18), easing: "ease-out", fill: "backwards" },
              );
        }
        last.current = { level, at: now, el: i };
        return true;
      },
    }),
    [reduce],
  );

  return (
    <div className="callouts" aria-hidden="true" ref={root}>
      {Array.from({ length: POOL }, (_, i) => (
        <span
          key={i}
          className="callout"
          ref={(n) => {
            els.current[i] = n;
          }}
        >
          {Array.from({ length: LETTERS }, (_, k) => (
            <i key={k} />
          ))}
        </span>
      ))}
    </div>
  );
});
