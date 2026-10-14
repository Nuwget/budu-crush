"use client";

import { useEffect, useRef } from "react";
import { m } from "motion/react";
import { CheerDuo } from "@/components/characters/Pal";
import { ParticleCanvas, type ParticleHandle } from "@/components/effects/ParticleCanvas";
import { Button } from "@/components/ui/Button";
import { useNav } from "@/app-shell/nav";
import { TOTAL_LEVELS } from "@/game/levels";
import { useT } from "@/hooks/useT";
import { playSfx } from "@/lib/audio/sfx";

/** The payoff: Dudu and Bubu cheer together, the stars land one by one, confetti drifts down. */
export function VictoryScreen({ level, score, stars, best, isBest }: { level: number; score: number; stars: number; best: number; isBest: boolean }) {
  const nav = useNav();
  const t = useT();
  const particles = useRef<ParticleHandle>(null);

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => particles.current?.confetti(80), 350));
    for (let i = 0; i < stars; i++)
      timers.push(
        window.setTimeout(() => {
          playSfx("star", i);
          // each star lands with its own little burst, bigger every time; the third is the real triumph
          const el = document.querySelectorAll(".end-stars .star-big")[i]?.getBoundingClientRect();
          if (!el) return;
          const x = el.left + el.width / 2;
          const y = el.top + el.height / 2;
          particles.current?.sparkle(x, y, "#ffe36e", 6 + i * 3, 30 + i * 12);
          particles.current?.ring(x, y, "#ffe36e", 26 + i * 14);
          if (i === 2) particles.current?.confetti(30);
        }, 900 + i * 520),
      );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [stars]);

  const rise = (delay: number) => ({
    initial: nav.reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: nav.reduce ? 0 : 0.7, delay: nav.reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });
  const last = level >= TOTAL_LEVELS;

  return (
    <section className="screen screen-end" aria-label={t.win.title}>
      <ParticleCanvas ref={particles} reduce={nav.reduce} />
      <m.div className="end-chars end-duo" initial={nav.reduce ? false : { opacity: 0, scale: 0.4, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={nav.reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 13, delay: 0.1 }}>
        <CheerDuo />
      </m.div>
      <m.div className="end-panel panel" {...rise(0.2)}>
        <p className="panel-label">{t.levelN(level)}</p>
        <h1 className="end-title">{t.win.title}</h1>
        <div className="end-stars" role="img" aria-label={t.levelStars(stars)}>
          {[0, 1, 2].map((i) => (
            <m.i
              key={i}
              className={`star-icon star-big charm-star ${i < stars ? "is-lit" : ""}`}
              initial={nav.reduce ? false : { scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={nav.reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 12, delay: 0.9 + i * 0.52 }}
            />
          ))}
        </div>
        <p className="end-cozy">{t.win.cozy}</p>
        <dl className="end-stats">
          <div>
            <dt className="hud-label">{t.win.score}</dt>
            <dd>{score.toLocaleString(t.htmlLang)}</dd>
          </div>
          <div>
            <dt className="hud-label">{isBest ? t.win.newBest : t.win.best}</dt>
            <dd>{best.toLocaleString(t.htmlLang)}</dd>
          </div>
        </dl>
        <div className="end-actions">
          <Button variant="solid" className="gbtn-xl" onClick={() => (last ? nav.exitGame() : nav.go({ name: "game", level: level + 1, attempt: 0 }, { wipe: true }))}>
            {t.win.cont}
          </Button>
          <Button onClick={() => nav.go({ name: "game", level, attempt: Date.now() }, { wipe: true })}>{t.win.again}</Button>
          <Button onClick={() => nav.exitGame()}>{t.map}</Button>
        </div>
      </m.div>
    </section>
  );
}
