"use client";

import { useEffect, useRef } from "react";
import { m } from "motion/react";
import { Pal, type PalHandle } from "@/components/characters/Pal";
import { Button } from "@/components/ui/Button";
import { useNav } from "@/app-shell/nav";
import { useT } from "@/hooks/useT";
import { playSfx } from "@/lib/audio/sfx";

/** Not a failure screen: Dudu is a little deflated, Bubu leans in, and retrying is one tap. */
export function DefeatScreen({ level, score }: { level: number; score: number }) {
  const nav = useNav();
  const t = useT();
  const dudu = useRef<PalHandle>(null);
  const bubu = useRef<PalHandle>(null);
  useEffect(() => {
    playSfx("ui");
    // Dudu slumps, Bubu leans in to comfort him, and they do it once more a little later
    const go = () => {
      dudu.current?.play("sad", "drop");
      timers.push(window.setTimeout(() => bubu.current?.play("comfort", "heart"), 350));
    };
    const timers = [window.setTimeout(go, 700), window.setTimeout(go, 4600)];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);
  const rise = (delay: number) => ({
    initial: nav.reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: nav.reduce ? 0 : 0.7, delay: nav.reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });
  return (
    <section className="screen screen-end" aria-label={t.lose.title}>
      <m.div className="end-pair" {...rise(0.05)}>
        <Pal ref={dudu} who="dudu" side={1} reduce={nav.reduce} />
        <Pal ref={bubu} who="bubu" side={-1} reduce={nav.reduce} />
      </m.div>
      <m.div className="end-panel panel" {...rise(0.2)}>
        <p className="panel-label">{t.levelN(level)}</p>
        <h1 className="end-title">{t.lose.title}</h1>
        <p className="end-cozy">{t.lose.cozy}</p>
        <p className="end-score">
          <span className="hud-label">{t.score}</span> <b>{score.toLocaleString(t.htmlLang)}</b>
        </p>
        <div className="end-actions">
          <Button variant="solid" className="gbtn-xl" onClick={() => nav.go({ name: "game", level, attempt: Date.now() }, { wipe: true })}>
            {t.lose.retry}
          </Button>
          <Button onClick={() => nav.exitGame()}>{t.toMap}</Button>
        </div>
      </m.div>
    </section>
  );
}
