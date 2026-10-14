"use client";

import { useEffect, useMemo, useRef } from "react";
import { m } from "motion/react";
import { Duo, Pal, type DuoHandle, type PalHandle } from "@/components/characters/Pal";
import { ParticleCanvas, type ParticleHandle } from "@/components/effects/ParticleCanvas";
import { Board, type BoardHandle } from "@/components/game/Board";
import { LivesChip, MovesRing, ObjectiveBar, ScoreBlock, type ScoreHandle } from "@/components/game/Hud";
import { makeFx } from "@/components/game/fx";
import { useView } from "@/components/game/useView";
import { BackIcon, GearIcon, IconButton } from "@/components/ui/Button";
import { useNav } from "@/app-shell/nav";
import { GameController } from "@/game/controller";
import { getLevel, TOTAL_LEVELS } from "@/game/levels";
import { levelStars } from "@/game/scoring/score";
import { playSfx } from "@/lib/audio/sfx";
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
  const score = useRef<ScoreHandle>(null);
  const dudu = useRef<PalHandle>(null);
  const bubu = useRef<PalHandle>(null);
  const duo = useRef<DuoHandle>(null);
  const reduceRef = useRef(reduce);
  const navRef = useRef(nav);
  const tRef = useRef(t);
  useEffect(() => {
    reduceRef.current = reduce;
    navRef.current = nav;
    tRef.current = t;
  });

  // A new controller per level attempt. Construction is pure; timers start in the effect.
  const ctrl = useMemo(() => {
    // the fx object and onEnd read these refs only when an effect fires, never during render
    /* eslint-disable react-hooks/refs */
    const fx = makeFx({ board, particles, reduce: reduceRef, t: tRef, score, dudu, bubu, duo });
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

  // QA builds only (NEXT_PUBLIC_QA=1): lets the scripts in scripts/ stage a long cascade without playing for it
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_QA) (window as unknown as { __qa?: unknown }).__qa = { ctrl, fx: ctrl.fxForQa(), sfx: playSfx };
  }, [ctrl]);

  useEffect(() => {
    ctrl.start();
    return () => ctrl.dispose();
  }, [ctrl]);
  useEffect(() => ctrl.setReduceMotion(reduce), [ctrl, reduce]);

  const points = useView(ctrl, (v) => v.score);
  const combo = useView(ctrl, (v) => v.combo);
  const moves = useView(ctrl, (v) => v.moves);
  const collected = useView(ctrl, (v) => v.collected);
  const iceLeft = useView(ctrl, (v) => v.iceLeft);
  const notice = useView(ctrl, (v) => v.notice);
  const moved = useView(ctrl, (v) => v.moved);
  const showGuide = tutorial && !moved;

  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.42, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="screen screen-game" aria-label={t.levelN(level.id)}>
      <m.header className="hud-top" {...rise(0)}>
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
      </m.header>

      <m.div className="hud-obj" {...rise(0.04)}>
        <ObjectiveBar level={level} score={points} collected={collected} iceLeft={iceLeft} t={t} />
      </m.div>

      <m.div className="hud-stats" {...rise(0.08)}>
        <Pal ref={dudu} who="dudu" side={1} reduce={reduce} className="hud-dudu" />
        <div className="hud-center">
          <ScoreBlock ref={score} score={points} combo={combo} level={level} t={t} reduce={reduce} />
          <MovesRing moves={moves} total={level.moves} t={t} />
        </div>
        <Pal ref={bubu} who="bubu" side={-1} reduce={reduce} className="hud-bubu" />
      </m.div>

      <m.div className="board-slot" {...rise(0.1)}>
        {showGuide && (
          <p className="speech" role="note">
            {t.tutorialSwap}
          </p>
        )}
        <Board ref={board} ctrl={ctrl} level={level} t={t} finger={showGuide} reduce={reduce} />
        {notice === "shuffle" && <p className="toast">{t.noMoves}</p>}
        <Duo ref={duo} reduce={reduce} />
      </m.div>

      <ParticleCanvas ref={particles} reduce={reduce} />
    </section>
  );
}
