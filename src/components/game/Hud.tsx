"use client";

import { useEffect, useRef, useState } from "react";
import type { LevelDef } from "@/game/engine/types";
import { charmId } from "@/game/tiles/kinds";
import type { Dict } from "@/i18n/en";
import { HeartIcon } from "@/components/ui/Button";
import { useT } from "@/hooks/useT";

/** Counts toward its target with an ease-out, so a big combo visibly pays out. */
export function ScoreCounter({ value, reduce }: { value: number; reduce: boolean }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  const locale = useT().htmlLang;
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (reduce) {
      raf.current = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(raf.current);
    }
    const start = performance.now();
    const a = from.current;
    const dur = Math.min(900, 250 + Math.abs(value - a) * 1.2);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      from.current = a + (value - a) * e;
      setShown(Math.round(from.current));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, reduce]);
  return <span className="score-num">{shown.toLocaleString(locale)}</span>;
}

/** Score, plus three stars that light as the thresholds are passed. */
export function ScoreBlock({ score, level, t, reduce }: { score: number; level: LevelDef; t: Dict; reduce: boolean }) {
  return (
    <div className="score-block">
      <span className="hud-label">{t.score}</span>
      <ScoreCounter value={score} reduce={reduce} />
      {level.objective.type === "score" && (
        <span className="score-stars" aria-hidden="true">
          {level.stars.map((s, i) => (
            <i key={i} className={`star-icon charm-star ${score >= s ? "is-lit" : ""}`} />
          ))}
        </span>
      )}
    </div>
  );
}

/** Moves left, as a ring that empties. */
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
        <span className="moves-num">{moves}</span>
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
    <div className="objective glass" role="status" aria-label={`${text}. ${right}`}>
      {icon}
      <span className="obj-text">{text}</span>
      <span className="obj-progress">{right}</span>
      <span className="obj-bar" aria-hidden="true">
        <span className="obj-fill" style={{ transform: `scaleX(${pct / 100})` }} />
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

export function ComboBanner({ banner, t }: { banner: { id: number; tier: number; combo: number } | null; t: Dict }) {
  if (!banner) return null;
  const idx = Math.min(banner.combo >= 7 ? 4 : banner.tier, 4);
  return (
    <div key={banner.id} className={`combo-banner tier-${banner.tier}`} aria-hidden="true">
      {t.combo[idx]}
    </div>
  );
}
