"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onWorldPulse } from "@/lib/juiceBus";
import { Mist } from "./Mist";
import { Motes } from "./Motes";
import { Scenery } from "./Scenery";
import { Stars } from "./Stars";

export type WorldMood = "gate" | "home" | "map" | "play" | "victory" | "defeat";

/**
 * The night world every screen lives in. Mounted once, so it never restarts between
 * screens; only the mood changes (CSS variables on the root ease the moon, skyline,
 * mist and tint toward the new values).
 *
 *   BACK   skyline + moon + clouds
 *   MID    domain-warped mist (WebGL) + pixel stars
 *   FRONT  drifting warm and lavender motes
 */
export function World({ mood }: { mood: WorldMood }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // The first frame is the CSS sky (gradient, moon, skyline). The WebGL mist, the star canvas and the motes start
  // when the browser is idle and fade in: the player never waits for them, and the shader compile stays off the
  // path of the first paint and the first tap.
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => setLive(true), { timeout: 700 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setLive(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  // Pointer parallax, only where there is a real pointer (never on touch screens).
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let nx = 0;
    let ny = 0;
    const onMove = (e: PointerEvent) => {
      nx = (e.clientX / window.innerWidth) * 2 - 1;
      ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty("--px", nx.toFixed(3));
          el.style.setProperty("--py", ny.toFixed(3));
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  // A good play makes the light behind the board swell for a moment (one opacity animation).
  const pulse = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onWorldPulse((level) => {
        pulse.current?.animate([{ opacity: 0 }, { opacity: 0.22 + level * 0.1, offset: 0.25 }, { opacity: 0 }], { duration: 600 + level * 160, easing: "ease-out" });
      }),
    [],
  );

  return (
    <div ref={ref} className="world" data-mood={mood} aria-hidden="true">
      {live && <Mist key={reduce ? "still" : "live"} active still={reduce} fps={mood === "play" ? 12 : 30} />}
      {live && <Stars key={reduce ? "still-stars" : "live-stars"} active still={reduce} />}
      <div className="world-aura" />
      <i className="world-shoot" />
      <i className="world-shoot s2" />
      <div ref={pulse} className="world-pulse" />
      <Scenery />
      {live && <Motes />}
      <div className="world-tint" />
      <div className="world-vignette" />
    </div>
  );
}
