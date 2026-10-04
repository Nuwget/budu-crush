"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { Bubu } from "@/components/characters/Bubu";
import { DuduAvatar } from "@/components/characters/DuduAvatar";
import { BackIcon, GearIcon, IconButton } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { useNav } from "@/app-shell/nav";
import { TOTAL_LEVELS } from "@/game/levels";
import { CHARM_IDS } from "@/game/tiles/kinds";
import { useT } from "@/hooks/useT";
import { playSfx } from "@/lib/audio/sfx";
import { unlockAudio } from "@/lib/audio/engine";
import { useSaved } from "@/state/store";
import { MAP_HEIGHT, NODE_KINDS, nodePositions, pathBetween } from "./mapLayout";

/** Small drifting cloud decorations along the path (pure CSS shapes, no extra assets). */
const CLOUDS = [
  { level: 2, x: 12 }, { level: 5, x: 84 }, { level: 8, x: 10 }, { level: 11, x: 88 },
  { level: 14, x: 14 }, { level: 17, x: 82 }, { level: 20, x: 8 }, { level: 23, x: 86 },
  { level: 26, x: 12 }, { level: 29, x: 84 },
];

/** The night city: a winding path of lit windows, moons and stars. Dudu waits on your current level. */
export function MapScreen() {
  const nav = useNav();
  const t = useT();
  const { progress } = useSaved();
  const scroller = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => nodePositions(), []);
  const current = Math.min(progress.unlocked, TOTAL_LEVELS);
  const cur = nodes[current - 1];

  // Start at the bottom of the city, then drift up to wherever Dudu is.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    const target = Math.max(0, cur.y - el.clientHeight * 0.58);
    const id = window.requestAnimationFrame(() => el.scrollTo({ top: target, behavior: nav.reduce ? "auto" : "smooth" }));
    return () => cancelAnimationFrame(id);
  }, [cur.y, nav.reduce]);

  const open = (level: number, el: HTMLElement) => {
    unlockAudio();
    playSfx("click");
    const r = el.getBoundingClientRect();
    nav.go({ name: "game", level, attempt: 0 }, { wipe: true, origin: [(r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight] });
  };

  return (
    <section className="screen screen-map" aria-label={t.mapTitle}>
      <header className="map-head">
        <IconButton label={t.back} onClick={() => nav.go({ name: "home" })}>
          <BackIcon />
        </IconButton>
        <h1 className="map-title">{t.mapTitle}</h1>
        <IconButton label={t.settings} onClick={() => nav.openSettings()}>
          <GearIcon />
        </IconButton>
      </header>

      <div ref={scroller} className="map-scroll">
        <div className="map-world" style={{ height: MAP_HEIGHT }}>
          <svg className="map-path" viewBox={`0 0 100 ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={pathBetween(nodes, 1, TOTAL_LEVELS)} className="map-path-all" />
            <path d={pathBetween(nodes, 1, current)} className="map-path-done" />
          </svg>

          {CLOUDS.map((c) => (
            <i key={c.level} className="map-cloud" aria-hidden="true" style={{ left: `${c.x}%`, top: nodes[c.level - 1].y - 30 }} />
          ))}
          <div className="map-bubu" aria-hidden="true" style={{ top: nodes[3].y - 20 }}>
            <Bubu sleeping />
          </div>

          <ol className="map-nodes">
            {nodes.map((n, i) => {
              const rec = progress.levels[n.level];
              const locked = n.level > progress.unlocked;
              const isCurrent = n.level === current;
              const kind = NODE_KINDS[i % NODE_KINDS.length];
              return (
                <li key={n.level} className="map-node-slot" style={{ left: `${n.x}%`, top: n.y }}>
                  {isCurrent && (
                    <motion.span
                      className="map-dudu"
                      aria-hidden="true"
                      initial={nav.reduce ? false : { y: -40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={nav.reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 11, delay: 0.5 }}
                    >
                      <span className="map-dudu-bob">
                        <DuduAvatar size={46} />
                      </span>
                      <i className="map-dudu-shadow" />
                    </motion.span>
                  )}
                  <button
                    type="button"
                    className={`node ${locked ? "is-locked" : ""} ${isCurrent ? "is-current" : ""} ${rec ? "is-done" : ""}`}
                    disabled={locked}
                    aria-label={`${t.levelN(n.level)}${locked ? `. ${t.levelLocked}` : rec ? `. ${t.levelStars(rec.stars)}` : ""}`}
                    aria-current={isCurrent ? "step" : undefined}
                    onClick={(e) => open(n.level, e.currentTarget)}
                  >
                    <i className={`node-art charm-${CHARM_IDS[kind]}`} aria-hidden="true" />
                    <span className="node-num">{n.level}</span>
                  </button>
                  {rec && <Stars n={rec.stars} size={14} className="node-stars" />}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
