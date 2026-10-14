"use client";

import { m } from "motion/react";
import { Bubu } from "@/components/characters/Bubu";
import { Dudu } from "@/components/characters/Dudu";
import { Button, GearIcon, IconButton } from "@/components/ui/Button";
import { useNav } from "@/app-shell/nav";
import { TOTAL_LEVELS } from "@/game/levels";
import { useT } from "@/hooks/useT";
import { useSaved } from "@/state/store";
import { unlockAudio } from "@/lib/audio/engine";
import { playSfx } from "@/lib/audio/sfx";

/** The title screen: Dudu up front, Bubu napping behind, one big way in. */
export function HomeScreen() {
  const nav = useNav();
  const t = useT();
  const { progress } = useSaved();
  const current = Math.min(progress.unlocked, TOTAL_LEVELS);
  const fresh = progress.unlocked <= 1 && Object.keys(progress.levels).length === 0;

  const rise = (delay: number) => ({
    initial: nav.reduce ? false : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: nav.reduce ? 0 : 0.9, delay: nav.reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const play = () => {
    unlockAudio();
    playSfx("ui");
    nav.go({ name: "game", level: current, attempt: 0 }, { wipe: true });
  };

  return (
    <section className="screen screen-home" aria-label={t.title}>
      <div className="home-top">
        <IconButton label={t.settings} onClick={() => nav.openSettings()}>
          <GearIcon />
        </IconButton>
      </div>

      <div className="home-hero">
        <m.div
          className="home-dudu"
          initial={nav.reduce ? false : { opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={nav.reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
        >
          <div className="home-halo" aria-hidden="true" />
          <Dudu mood="smile" />
        </m.div>
        <m.div className="home-bubu" {...rise(0.55)}>
          <Bubu sleeping />
        </m.div>
      </div>

      <m.h1 className="home-title" {...rise(0.35)}>
        {t.title}
      </m.h1>
      <m.p className="home-tagline" {...rise(0.45)}>
        {t.tagline}
      </m.p>

      <m.div className="home-actions" {...rise(0.6)}>
        <Button variant="solid" className="gbtn-xl" onClick={play}>
          {fresh ? t.play : t.continueLevel(current)}
        </Button>
        <Button
          onClick={() => {
            playSfx("ui");
            nav.go({ name: "map" });
          }}
        >
          {t.map}
        </Button>
      </m.div>
    </section>
  );
}
