"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { Bubu } from "@/components/characters/Bubu";
import { Dudu } from "@/components/characters/Dudu";
import { ParticleCanvas, type ParticleHandle } from "@/components/effects/ParticleCanvas";
import { Board, type BoardHandle } from "@/components/game/Board";
import { ComboBanner, LivesChip, MovesRing, ObjectiveBar, ScoreBlock } from "@/components/game/Hud";
import { makeFx } from "@/components/game/fx";
import { useView } from "@/components/game/useView";
import { BackIcon, GearIcon, IconButton } from "@/components/ui/Button";
import { useNav } from "@/app-shell/nav";
import { GameController } from "@/game/controller";
import { getLevel, TOTAL_LEVELS } from "@/game/levels";
import { levelStars } from "@/game/scoring/score";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useT } from "@/hooks/useT";
import { actions, getSaved, useSaved } from "@/state/store";

/** One level of play: HUD, characters, board and effects, wired to a GameController. */
export function GameScreen({ levelNumber, attempt }: { levelNumber: number; attempt: number }) {
  const nav = useNav();
  const t = useT();
  const saved = useSaved();
  const reduce = useReducedMotion();
  const level = useMemo(() => getLevel(levelNumber), [levelNumber]);
  const tutorial = !!level.tutorial && !saved.progress.tutorialDone;

  const board = useRef<BoardHandle>(null);
  const particles = useRef<ParticleHandle>(null);
  const reduceRef = useRef(reduce);
  const navRef = useRef(nav);
  useEffect(() => {
    reduceRef.current = reduce;
    navRef.current = nav;
  });

  // A new controller per level attempt. Construction is pure; timers start in the effect.
  const ctrl = useMemo(() => {
    // the fx object and onEnd read these refs only when an effect fires, never during render
    /* eslint-disable react-hooks/refs */
    const fx = makeFx({ board, particles, reduce: reduceRef });
    return new GameController(level, fx, {
      reduceMotion: reduce,
      tutorial,
      onFirstMove: () => {
        if (level.tutorial) actions.tutorialDone();
      },
      onEnd: (status, score, movesLeft) => {
        const n = level.id;
        if (status === "won") {
          const prevBest = getSaved().progress.levels[n]?.best ?? 0;
          const stars = levelStars(level.objective.type, score, level.stars, movesLeft, level.moves);
          actions.completeLevel(n, score, stars, TOTAL_LEVELS);
          navRef.current.go({ name: "victory", level: n, score, stars, best: Math.max(prevBest, score), isBest: score > prevBest });
        } else navRef.current.go({ name: "defeat", level: n, score });
      },
    });
    /* eslint-enable react-hooks/refs */
    // the tutorial flag is read once per attempt on purpose: finishing it mid-level must not rebuild the board
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, attempt]);

  useEffect(() => {
    ctrl.start();
    return () => ctrl.dispose();
  }, [ctrl]);
  useEffect(() => ctrl.setReduceMotion(reduce), [ctrl, reduce]);

  const score = useView(ctrl, (v) => v.score);
  const moves = useView(ctrl, (v) => v.moves);
  const collected = useView(ctrl, (v) => v.collected);
  const iceLeft = useView(ctrl, (v) => v.iceLeft);
  const mood = useView(ctrl, (v) => v.mood);
  const banner = useView(ctrl, (v) => v.banner);
  const notice = useView(ctrl, (v) => v.notice);
  const moved = useView(ctrl, (v) => v.moved);
  const showGuide = tutorial && !moved;

  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="screen screen-game" aria-label={t.levelN(level.id)}>
      <motion.header className="hud-top" {...rise(0.05)}>
        <IconButton label={t.back} onClick={() => nav.exitGame()}>
          <BackIcon />
        </IconButton>
        <h1 className="hud-level">{t.levelN(level.id)}</h1>
        <div className="hud-right">
          <LivesChip t={t} />
          <IconButton label={t.settings} onClick={() => nav.openSettings()}>
            <GearIcon />
          </IconButton>
        </div>
      </motion.header>

      <motion.div {...rise(0.12)}>
        <ObjectiveBar level={level} score={score} collected={collected} iceLeft={iceLeft} t={t} />
      </motion.div>

      <motion.div className="hud-stats" {...rise(0.2)}>
        <div className="hud-char hud-dudu">
          <Dudu mood={mood} />
        </div>
        <div className="hud-center">
          <ScoreBlock score={score} level={level} t={t} reduce={reduce} />
          <MovesRing moves={moves} total={level.moves} t={t} />
        </div>
        <div className="hud-char hud-bubu">
          <Bubu sleeping />
        </div>
      </motion.div>

      <motion.div className="board-slot" {...rise(0.3)}>
        {showGuide && (
          <p className="speech" role="note">
            {t.tutorialSwap}
          </p>
        )}
        <Board ref={board} ctrl={ctrl} level={level} t={t} finger={showGuide} />
        <ComboBanner banner={banner} t={t} />
        {notice === "shuffle" && <p className="toast">{t.noMoves}</p>}
      </motion.div>

      <ParticleCanvas ref={particles} reduce={reduce} />
    </section>
  );
}
