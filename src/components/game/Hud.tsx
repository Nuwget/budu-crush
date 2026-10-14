"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { LevelDef } from "@/game/engine/types";
import { charmId } from "@/game/tiles/kinds";
import type { Dict } from "@/i18n/en";
import { HeartIcon } from "@/components/ui/Button";
import { useT } from "@/hooks/useT";
import { run } from "@/lib/anim";

export interface ScoreHandle {
  /** Centre of the number in viewport coordinates, where orbs fly to. */
  point(): { x: number; y: number } | null;
  /** The number takes a hit of the given intensity (0 soft .. 4 big). */
  pop(level: number): void;
  /** Centre of the nth star (0-2) in viewport coordinates. */
  starPoint(index: number): { x: number; y: number } | null;
}

/** Counts toward its target with an ease-out, so a big combo visibly pays out. */
function ScoreCounter({ value, reduce }: { value: number; reduce: boolean }) {
  const [initial] = useState(value);
  const el = useRef<HTMLSpanElement>(null);
  const from = useRef(value);
  const raf = useRef(0);
  const locale = useT().htmlLang;
  // The number is written straight to the DOM: counting up is ~20 updates a second that React never needs to see.
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    cancelAnimationFrame(raf.current);
    const write = (n: number) => {
      from.current = n;
      node.textContent = Math.round(n).toLocaleString(locale);
    };
    if (reduce) {
      write(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const dur = Math.min(900, 250 + Math.abs(value - a) * 1.2);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      write(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, reduce, locale]);
  return (
    <span ref={el} className="score-num">
      {initial.toLocaleString(locale)}
    </span>
  );
}

const SCORE_POP = [
  { s: 1.08, r: 0 },
  { s: 1.14, r: -1 },
  { s: 1.22, r: 1.5 },
  { s: 1.32, r: -2 },
  { s: 1.42, r: 2 },
];

/** Score, three stars that light as the thresholds are passed, and the combo multiplier. */
export const ScoreBlock = forwardRef<ScoreHandle, { score: number; combo: number; level: LevelDef; t: Dict; reduce: boolean }>(function ScoreBlock({ score, combo, level, t, reduce }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLDivElement>(null);
  useImperativeHandle(
    ref,
    () => ({
      point() {
        const r = box.current?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.4 } : null;
      },
      starPoint(i) {
        const r = box.current?.querySelectorAll(".score-stars i")[i]?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      },
      pop(lvl) {
        const el = num.current;
        if (!el || reduce) return;
        const k = SCORE_POP[Math.min(lvl, 4)];
        run(
          el,
          [
            { transform: "scale(1) rotate(0deg)", offset: 0 },
            { transform: `scale(${k.s}) rotate(${k.r}deg)`, offset: 0.28, easing: "cubic-bezier(0.2, 1.6, 0.4, 1)" },
            { transform: "scale(1) rotate(0deg)", offset: 1 },
          ],
          { duration: 300 + lvl * 50, easing: "ease-out" },
        );
      },
    }),
    [reduce],
  );
  return (
    <div className="score-block" ref={box}>
      <span className="hud-label">{t.score}</span>
      <div className="score-pop" ref={num}>
        <ScoreCounter value={score} reduce={reduce} />
        <span className="combo-chip" data-on={combo >= 2} data-hot={combo >= 4} aria-hidden="true">
          <b key={combo}>×{Math.min(combo, 9)}</b>
        </span>
      </div>
      {level.objective.type === "score" && (
        <span className="score-stars" aria-hidden="true">
          {level.stars.map((s, i) => (
            <i key={i} className={`star-icon charm-star ${score >= s ? "is-lit" : ""}`} style={{ "--pk": [1.5, 1.8, 2.2][i] } as React.CSSProperties} />
          ))}
        </span>
      )}
    </div>
  );
});

/** Moves left, as a small ring that empties. The number re-mounts on every change so it can pop. */
export function MovesRing({ moves, total, t }: { moves: number; total: number; t: Dict }) {
  const R = 22;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, moves / total);
  return (
    <div className={`moves ${moves <= 5 ? "is-low" : ""}`} role="status" aria-label={`${t.moves}: ${moves}`}>
      <div className="moves-dial" aria-hidden="true">
        <svg viewBox="0 0 52 52" className="moves-ring">
          <circle cx="26" cy="26" r={R} className="moves-track" />
          <circle cx="26" cy="26" r={R} className="moves-arc" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 26 26)" />
        </svg>
        <span key={moves} className="moves-num">
          {moves}
        </span>
      </div>
      <span className="hud-label" aria-hidden="true">
        {t.moves}
      </span>
    </div>
  );
}

/** What the level asks for, with a progress bar. Text comes from the active dictionary. */
export function ObjectiveBar({ level, score, collected, iceLeft, t }: { level: LevelDef; score: number; collected: number; iceLeft: number; t: Dict }) {
  const o = level.objective;
  const iceTotal = level.layout.reduce((n, row) => n + [...row].reduce((m, ch) => m + (ch === "i" ? 1 : ch === "I" ? 2 : 0), 0), 0);
  let text: string;
  let progress: number;
  let right: string;
  let icon: React.ReactNode;
  if (o.type === "score") {
    text = t.objective.score(o.target);
    progress = score / o.target;
    right = t.objectiveProgress(score, o.target);
    icon = <i className="obj-icon charm-star" />;
  } else if (o.type === "collect") {
    text = t.objective.collect(o.count, t.charms[o.kind]);
    progress = collected / o.count;
    right = t.objectiveProgress(collected, o.count);
    icon = <i className={`obj-icon charm-${charmId(o.kind)}`} />;
  } else {
    text = t.objective.ice;
    progress = 1 - iceLeft / Math.max(1, iceTotal);
    right = t.frostLeft(iceLeft);
    icon = <i className="obj-icon obj-frost" />;
  }
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className={`objective glass ${pct >= 100 ? "is-done" : ""}`} role="status" aria-label={`${text}. ${right}`}>
      {icon}
      <span className="obj-text">{text}</span>
      <span key={right} className="obj-progress">
        {right}
      </span>
      <span className="obj-bar" aria-hidden="true">
        <span className="obj-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        <span key={pct} className="obj-glint" />
      </span>
    </div>
  );
}

/** Lives are decorative in this game: they never run out. */
export function LivesChip({ t }: { t: Dict }) {
  return (
    <span className="lives" role="img" aria-label={t.lives(5)}>
      <HeartIcon size={18} />
      <b>5</b>
    </span>
  );
}
