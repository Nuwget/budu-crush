"use client";

import { useEffect, useState } from "react";
import { useSaved } from "@/state/store";

/**
 * True when motion should be calmed down: the player's setting wins, otherwise the OS
 * preference. The OS value is read after mount so the first client render matches the
 * server HTML.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSaved();
  const [system, setSystem] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystem(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return settings.motion === "reduce" ? true : settings.motion === "full" ? false : system;
}
