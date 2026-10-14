"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { busy, run } from "@/lib/anim";
import { asset } from "@/lib/asset";

export type PalKind = "dudu" | "bubu";
export type PalMove = "nod" | "hop" | "cheer" | "oops" | "sad" | "comfort" | "worry" | "tilt";
export type Emote = "sparkle" | "heart" | "drop" | "bang" | "";

export interface PalHandle {
  play(move: PalMove, emote?: Emote): void;
  /** Look toward a horizontal position on the board (0..1). A small lean, then back. */
  glance(x: number): void;
}

/** Sprite and its intrinsic size; the height is what the layout sets. */
const ART = {
  dudu: { src: "/images/pals/dudu-snack.webp", w: 331, h: 360 },
  bubu: { src: "/images/pals/bubu-snack.webp", w: 283, h: 360 },
} as const;

const SPRING = "cubic-bezier(0.2, 1.5, 0.4, 1)";
const OUT = "cubic-bezier(0.2, 0.7, 0.3, 1)";
const IN_OUT = "cubic-bezier(0.45, 0, 0.3, 1)";

type Frames = { frames: Keyframe[]; duration: number };

/**
 * The motions, as keyframes in the sprite's own box (origin at the feet). Each follows the
 * same recipe: a squat that anticipates, a stretch on take-off, a squash on landing that is
 * a touch bigger than the squat, then a small settle. `s` mirrors the sideways parts so the
 * left and right character lean toward each other.
 */
function motion(move: PalMove, s: 1 | -1): Frames {
  const T = (y = 0, sx = 1, sy = 1, rot = 0, x = 0) => `translate(${x}%, ${y}%) rotate(${rot}deg) scale(${sx}, ${sy})`;
  switch (move) {
    case "nod":
      return { duration: 260, frames: [{ transform: T(), offset: 0 }, { transform: T(-5, 0.99, 1.03), offset: 0.4, easing: OUT }, { transform: T(), offset: 1 }] };
    case "hop":
      return { duration: 360, frames: [{ transform: T(), offset: 0 }, { transform: T(-9, 0.97, 1.05, -2 * s), offset: 0.4, easing: OUT }, { transform: T(0, 1.03, 0.97), offset: 0.75 }, { transform: T(), offset: 1 }] };
    case "cheer":
      return { duration: 560, frames: [{ transform: T(), offset: 0 }, { transform: T(-13, 0.96, 1.07, -4 * s), offset: 0.3, easing: OUT }, { transform: T(0, 1.04, 0.96), offset: 0.55 }, { transform: T(-7, 0.98, 1.03, 3 * s), offset: 0.75, easing: OUT }, { transform: T(), offset: 1 }] };
    case "oops":
      return {
        duration: 620,
        frames: [
          { transform: T(), offset: 0 },
          { transform: T(1, 1.07, 0.9, -3 * s), offset: 0.12, easing: OUT },
          { transform: T(0, 1, 1, 4, 4), offset: 0.28 },
          { transform: T(0, 1, 1, -4, -4), offset: 0.44 },
          { transform: T(0, 1, 1, 3, 3), offset: 0.6 },
          { transform: T(0, 1, 1, -1.5, -1.5), offset: 0.78 },
          { transform: T(), offset: 1 },
        ],
      };
    case "sad":
      return {
        duration: 1300,
        frames: [
          { transform: T(), offset: 0 },
          { transform: T(5, 1.04, 0.93, -4 * s), offset: 0.18, easing: OUT },
          { transform: T(6, 1.05, 0.92, -4 * s), offset: 0.82, easing: IN_OUT },
          { transform: T(-3, 0.97, 1.05), offset: 0.94, easing: SPRING },
          { transform: T(), offset: 1 },
        ],
      };
    case "comfort":
      return {
        duration: 1300,
        frames: [
          { transform: T(), offset: 0 },
          { transform: T(0, 1.05, 0.93, 0, -6 * s), offset: 0.15, easing: OUT },
          { transform: T(-6, 0.98, 1.04, 5 * s, -9 * s), offset: 0.3, easing: IN_OUT },
          { transform: T(0, 1.05, 0.94, 3 * s, -9 * s), offset: 0.44 },
          { transform: T(-6, 0.98, 1.04, 5 * s, -9 * s), offset: 0.6, easing: IN_OUT },
          { transform: T(0, 1.05, 0.94, 3 * s, -9 * s), offset: 0.74 },
          { transform: T(), offset: 1, easing: SPRING },
        ],
      };
    case "worry":
      return {
        duration: 640,
        frames: [
          { transform: T(), offset: 0 },
          { transform: T(0, 1, 1, 0, 2.5), offset: 0.16 },
          { transform: T(0, 1, 1, 0, -2.5), offset: 0.32 },
          { transform: T(0, 1, 1, 0, 2), offset: 0.48 },
          { transform: T(0, 1, 1, 0, -2), offset: 0.64 },
          { transform: T(), offset: 1 },
        ],
      };
    case "tilt":
      return {
        duration: 900,
        frames: [
          { transform: T(), offset: 0 },
          { transform: T(0, 1.03, 0.97, 7 * s), offset: 0.25, easing: OUT },
          { transform: T(0, 1.03, 0.97, 7 * s), offset: 0.7, easing: IN_OUT },
          { transform: T(), offset: 1, easing: SPRING },
        ],
      };
  }
}

const EMOTES: Record<Exclude<Emote, "">, React.ReactNode> = {
  sparkle: <path d="M12 1 14.6 9.4 23 12 14.6 14.6 12 23 9.4 14.6 1 12 9.4 9.4Z" fill="#fff3b0" stroke="#7a4a1c" strokeWidth="1.4" strokeLinejoin="round" />,
  heart: <path d="M12 21C5 15.5 2 12.2 2 8.5 2 5.6 4.2 3.5 6.9 3.5c1.9 0 3.5 1 5.1 3 1.6-2 3.2-3 5.1-3C19.8 3.5 22 5.6 22 8.5c0 3.7-3 7-10 12.5Z" fill="#ff7fae" stroke="#7a2346" strokeWidth="1.4" strokeLinejoin="round" />,
  drop: <path d="M12 2C9 7.5 5.5 11 5.5 15a6.5 6.5 0 0 0 13 0C18.5 11 15 7.5 12 2Z" fill="#9fdcff" stroke="#2a5d86" strokeWidth="1.4" strokeLinejoin="round" />,
  bang: (
    <g fill="#ffdf6b" stroke="#7a4a1c" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M9.6 2h4.8l-1 12h-2.8Z" />
      <circle cx="12" cy="19" r="2.6" />
    </g>
  ),
};

/**
 * Dudu or Bubu, as a character that lives in the HUD. Three nested layers keep the motions
 * from fighting: the outer one is layout, `.pal-fx` takes one-shot reactions (Web Animations,
 * so a cascade can retrigger them without a re-render), `.pal-idle` breathes forever in CSS.
 * Everything animates transform and opacity only.
 */
export const Pal = forwardRef<PalHandle, { who: PalKind; side: 1 | -1; reduce: boolean; className?: string }>(function Pal({ who, side, reduce, className = "" }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const emote = useRef<HTMLSpanElement>(null);
  const token = useRef(0);
  const shadow = useRef<HTMLSpanElement>(null);
  const glanceAnim = useRef<Animation | null>(null);
  const art = ART[who];

  useImperativeHandle(
    ref,
    () => ({
      play(move, e = "") {
        const el = fx.current;
        if (!el || reduce) return;
        glanceAnim.current?.cancel();
        const m = motion(move, side);
        const running: Animation[] = [run(el, m.frames, { duration: m.duration, easing: "linear" })];
        // the contact shadow follows the jump: it narrows and fades while the character is in the air
        const sh = shadow.current;
        if (sh && (move === "hop" || move === "cheer" || move === "nod")) {
          const air = move === "nod" ? 0.9 : 0.78;
          run(
            sh,
            move === "cheer"
              ? [{ transform: "scaleX(1)", opacity: 1 }, { transform: "scaleX(1.08)", opacity: 1, offset: 0.1 }, { transform: `scaleX(${air})`, opacity: 0.55, offset: 0.28 }, { transform: "scaleX(1.1)", opacity: 1, offset: 0.46 }, { transform: `scaleX(${air + 0.06})`, opacity: 0.6, offset: 0.64 }, { transform: "scaleX(1.06)", opacity: 1, offset: 0.8 }, { transform: "scaleX(1)", opacity: 1 }]
              : [{ transform: "scaleX(1)", opacity: 1 }, { transform: "scaleX(1.08)", opacity: 1, offset: 0.17 }, { transform: `scaleX(${air})`, opacity: 0.55, offset: 0.4 }, { transform: "scaleX(1.1)", opacity: 1, offset: 0.62 }, { transform: "scaleX(1)", opacity: 1 }],
            { duration: m.duration, easing: "linear" },
          );
        }
        const em = emote.current;
        if (em && e) {
          em.dataset.emote = e;
          running.push(run(em,
            [
              { opacity: 0, transform: "translate(-50%, 40%) scale(0.2)", offset: 0 },
              { opacity: 1, transform: "translate(-50%, -8%) scale(1.25) rotate(-8deg)", offset: 0.25, easing: SPRING },
              { opacity: 1, transform: "translate(-50%, -20%) scale(1) rotate(4deg)", offset: 0.7 },
              { opacity: 0, transform: "translate(-50%, -50%) scale(0.9) rotate(0deg)", offset: 1 },
            ],
            { duration: Math.max(700, m.duration), easing: "linear", fill: "both" },
          ));
        }
        // while a reaction plays the character is on the cast layer (CSS: .hud-stats:has(.pal[data-react]))
        const mine = ++token.current;
        const host = root.current;
        if (host) host.dataset.react = "";
        void Promise.allSettled(running.map((a) => a.finished)).then(() => {
          if (token.current === mine && host) delete host.dataset.react;
        });
      },
      glance(x) {
        const el = fx.current;
        if (!el || reduce || busy(el)) return;
        // lean a little toward where the action is, then settle back
        const lean = Math.max(-1, Math.min(1, (x - (side === 1 ? 0.15 : 0.85)) * 1.2)) * 3;
        glanceAnim.current = run(el, 
          [{ transform: "rotate(0deg)" }, { transform: `rotate(${lean}deg) translateX(${lean * 0.8}%)`, offset: 0.3, easing: OUT }, { transform: "rotate(0deg)" }],
          { duration: 520, easing: "ease-in-out" },
        );
      },
    }),
    [reduce, side],
  );

  return (
    <div ref={root} className={`pal pal-${who} ${className}`} aria-hidden="true" style={{ aspectRatio: `${art.w} / ${art.h}` }}>
      <div ref={fx} className="pal-fx">
        <div className="pal-idle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(art.src)} width={art.w} height={art.h} alt="" draggable={false} decoding="async" />
        </div>
      </div>
      <span ref={shadow} className="pal-shadow" />
      <span ref={emote} className="pal-emote">
        {(Object.keys(EMOTES) as Exclude<Emote, "">[]).map((k) => (
          <svg key={k} viewBox="0 0 24 24" data-k={k}>
            {EMOTES[k]}
          </svg>
        ))}
      </span>
    </div>
  );
});

/**
 * The two of them cheering together, popping up from the bottom edge of the screen for the
 * biggest moments and at the end of a level. One transform animation; the rest is the PNG.
 */
export interface DuoHandle {
  peek(): void;
}
export const Duo = forwardRef<DuoHandle, { reduce: boolean }>(function Duo({ reduce }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const token = useRef(0);
  useImperativeHandle(
    ref,
    () => ({
      peek() {
        const node = el.current;
        if (!node || reduce) return;
        // The pair lives inside the board's own stacking context, between the pieces and the words/numbers: always in
        // front of the board, never in front of a word. It is anchored to the bottom edge of the board (CSS: top: 100%),
        // rises until its heads are ~30% of its height over that edge, and ducks back below the screen.
        const h = node.offsetHeight || 150;
        const anchor = node.offsetParent?.getBoundingClientRect().bottom ?? window.innerHeight;
        const free = Math.max(0, window.innerHeight - anchor);
        const away = (free / h) * 100 + 108;
        const apex = -30;
        const y = (v: number) => `translate(-50%, ${v.toFixed(1)}%)`;
        node.style.visibility = "visible";
        // anticipation (a shy peek and a squat), take-off with a stretch, a squash on arrival, a happy wiggle, then they duck away
        const a = run(
          node,
          [
            { transform: `${y(away)} rotate(0deg) scale(1, 1)`, offset: 0 },
            { transform: `${y(apex + 71)} rotate(-1deg) scale(1.02, 0.98)`, offset: 0.12, easing: OUT },
            { transform: `${y(apex + 75)} rotate(1deg) scale(1.06, 0.92)`, offset: 0.2, easing: IN_OUT },
            { transform: `${y(apex)} rotate(-3deg) scale(0.94, 1.1)`, offset: 0.36, easing: IN_OUT },
            { transform: `${y(apex + 12)} rotate(2deg) scale(1.08, 0.9)`, offset: 0.48, easing: SPRING },
            { transform: `${y(apex + 9)} rotate(-2.5deg) scale(1, 1)`, offset: 0.58, easing: IN_OUT },
            { transform: `${y(apex + 6)} rotate(2.5deg) scale(1.02, 0.99)`, offset: 0.68, easing: IN_OUT },
            { transform: `${y(apex + 9)} rotate(0deg) scale(1, 1)`, offset: 0.78 },
            { transform: `${y(away)} rotate(0deg) scale(1, 1)`, offset: 1, easing: "cubic-bezier(0.5, 0, 0.9, 0.4)" },
          ],
          { duration: 1100, easing: "linear" },
        );
        const mine = ++token.current;
        void a.finished.then(
          () => {
            if (token.current === mine) node.style.visibility = "hidden";
          },
          () => {},
        );
      },
    }),
    [reduce],
  );
  return (
    <div ref={el} className="duo-peek" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/images/pals/duo-cheer.webp")} width={604} height={420} alt="" draggable={false} decoding="async" />
    </div>
  );
});

/** A still, always-visible version of the pair for end screens: they bounce on their own. */
export function CheerDuo({ className = "" }: { className?: string }) {
  return (
    <div className={`duo-still ${className}`} aria-hidden="true">
      <div className="duo-still-bob">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/images/pals/duo-cheer.webp")} width={604} height={420} alt="" draggable={false} decoding="async" />
      </div>
    </div>
  );
}
