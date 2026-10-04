"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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

  return (
    <div ref={ref} className="world" data-mood={mood} aria-hidden="true">
      <Mist key={reduce ? "still" : "live"} active still={reduce} fps={mood === "play" ? 24 : 40} />
      <Stars key={reduce ? "still-stars" : "live-stars"} active still={reduce} />
      <Scenery />
      <Motes />
      <div className="world-tint" />
      <div className="world-vignette" />
    </div>
  );
}
