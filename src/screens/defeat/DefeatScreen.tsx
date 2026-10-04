"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Bubu } from "@/components/characters/Bubu";
import { Dudu } from "@/components/characters/Dudu";
import { Button } from "@/components/ui/Button";
import { useNav } from "@/app-shell/nav";
import { useT } from "@/hooks/useT";
import { playSfx } from "@/lib/audio/sfx";

/** Not a failure screen: Dudu is a little deflated, Bubu is unbothered, and retrying is one tap. */
export function DefeatScreen({ level, score }: { level: number; score: number }) {
  const nav = useNav();
  const t = useT();
  useEffect(() => {
    playSfx("click");
  }, []);
  const rise = (delay: number) => ({
    initial: nav.reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: nav.reduce ? 0 : 0.7, delay: nav.reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });
  return (
    <section className="screen screen-end" aria-label={t.lose.title}>
      <div className="end-chars">
        <motion.div className="end-dudu" {...rise(0.05)}>
          <Dudu mood="sad" />
        </motion.div>
        <motion.div className="end-bubu" {...rise(0.25)}>
          <Bubu sleeping />
        </motion.div>
      </div>
      <motion.div className="end-panel panel" {...rise(0.2)}>
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
      </motion.div>
    </section>
  );
}
