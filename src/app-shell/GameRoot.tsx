"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PixelWipe, type WipeHandle } from "@/components/effects/PixelWipe";
import { World } from "@/components/world/World";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DICTS } from "@/i18n";
import { getBuses, setAudioEnabled, unlockAudio } from "@/lib/audio/engine";
import { setMusicMood, startMusic, stopMusic } from "@/lib/audio/music";
import { DefeatScreen } from "@/screens/defeat/DefeatScreen";
import { GameScreen } from "@/screens/game/GameScreen";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { LanguageScreen } from "@/screens/language/LanguageScreen";
import { MapScreen } from "@/screens/map/MapScreen";
import { SettingsSheet } from "@/screens/settings/SettingsSheet";
import { VictoryScreen } from "@/screens/victory/VictoryScreen";
import { useSaved } from "@/state/store";
import { NavContext, type GoOptions, type Nav } from "./nav";
import { isInGame, moodFor, type ScreenState } from "./screens";

const COVER_MS = 560;
const UNCOVER_MS = 760;

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * The app shell: the night world (mounted once), the current screen, the pixel wipe between
 * big moments, the settings sheet, audio unlocking and the Back-button behaviour.
 */
export function GameRoot() {
  const saved = useSaved();
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<ScreenState | null>(null);
  const [sheet, setSheet] = useState(false);
  const wipe = useRef<WipeHandle>(null);
  const busy = useRef(false);

  // First launch asks for a language; afterwards the app opens on the home screen. Until
  // localStorage has been read there is nothing to show but the world.
  const screen: ScreenState | null = picked ?? (saved.ready ? (saved.lang ? { name: "home" } : { name: "language" }) : null);
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  });

  const go = useCallback(
    (next: ScreenState, opts: GoOptions = {}) => {
      if (busy.current) return;
      busy.current = true;
      const swap = () => {
        opts.beforeSwap?.();
        const from = screenRef.current;
        // entering a level adds a history entry, so the browser Back button leaves it
        if (next.name === "game" && from && !isInGame(from) && !(window.history.state && window.history.state.budu))
          window.history.pushState({ ...(window.history.state ?? {}), budu: 1 }, "");
        setPicked(next);
      };
      if (reduce || !opts.wipe || !wipe.current) {
        swap();
        window.setTimeout(() => (busy.current = false), reduce ? 40 : 300);
        return;
      }
      const origin = opts.origin ?? [0.5, 0.5];
      const w = wipe.current;
      void w.cover(origin, COVER_MS).then(async () => {
        swap();
        await frame();
        await frame();
        await w.uncover(origin, UNCOVER_MS);
        busy.current = false;
      });
    },
    [reduce],
  );

  const exitGame = useCallback(() => {
    if (window.history.state && window.history.state.budu) window.history.back();
    else go({ name: "map" });
  }, [go]);

  // Browser/Android Back from a level returns to the map instead of leaving the site.
  useEffect(() => {
    const onPop = () => {
      const s = screenRef.current;
      if (s && isInGame(s)) {
        setSheet(false);
        go({ name: "map" });
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [go]);

  // Audio can only start inside a gesture; the first tap or key anywhere unlocks it.
  const { music, sfx } = saved.settings;
  useEffect(() => {
    const unlock = () => {
      if (unlockAudio()) startMusic("calm");
    };
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);
  useEffect(() => {
    setAudioEnabled(music, sfx);
    if (!music) stopMusic();
    else if (getBuses()) startMusic();
  }, [music, sfx]);
  const musicMood = screen?.name === "game" ? "play" : "calm";
  useEffect(() => setMusicMood(musicMood), [musicMood]);

  useEffect(() => {
    document.documentElement.lang = DICTS[saved.lang ?? "pt"].htmlLang;
  }, [saved.lang]);
  // lets CSS honour the in-game motion setting as well as the OS preference
  const motionPref = saved.settings.motion;
  useEffect(() => {
    document.documentElement.dataset.motion = motionPref;
  }, [motionPref]);

  const nav: Nav | null = screen ? { screen, go, exitGame, openSettings: () => setSheet(true), reduce } : null;
  const inGame = !!screen && isInGame(screen);
  const key = !screen ? "boot" : screen.name === "game" ? `game-${screen.level}-${screen.attempt}` : screen.name;

  return (
    <>
      <World mood={screen ? moodFor(screen) : "gate"} />
      <PixelWipe ref={wipe} />
      {/* go() and exitGame() read refs, but only when called from events */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {nav && screen && (
        <NavContext.Provider value={nav}>
          <main className="app" inert={sheet}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={key}
                className="screen-host"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.22 }}
              >
                {screen.name === "language" && <LanguageScreen />}
                {screen.name === "home" && <HomeScreen />}
                {screen.name === "map" && <MapScreen />}
                {screen.name === "game" && <GameScreen levelNumber={screen.level} attempt={screen.attempt} />}
                {screen.name === "victory" && <VictoryScreen level={screen.level} score={screen.score} stars={screen.stars} best={screen.best} isBest={screen.isBest} />}
                {screen.name === "defeat" && <DefeatScreen level={screen.level} score={screen.score} />}
              </motion.div>
            </AnimatePresence>
          </main>
          <SettingsSheet
            open={sheet}
            onClose={() => setSheet(false)}
            reduce={reduce}
            onRestart={screen.name === "game" ? () => { setSheet(false); go({ name: "game", level: screen.level, attempt: Date.now() }); } : undefined}
            onMap={inGame ? () => { setSheet(false); exitGame(); } : undefined}
          />
        </NavContext.Provider>
      )}
    </>
  );
}
