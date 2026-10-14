import type { Fx, Reaction } from "@/game/controller";
import type { Callout } from "@/game/juice";
import type { Special } from "@/game/engine/types";
import type { ParticleHandle } from "@/components/effects/ParticleCanvas";
import { haptic, type Haptic } from "@/lib/haptics";
import { playSfx, type SfxName } from "@/lib/audio/sfx";
import type { Dict } from "@/i18n/en";
import { pulseWorld } from "@/lib/juiceBus";
import type { DuoHandle, PalHandle } from "@/components/characters/Pal";
import type { BoardHandle } from "./Board";
import type { ScoreHandle } from "./Hud";

export const CHARM_COLORS = ["#ffe3a0", "#ffc83d", "#d2e6ff", "#ff6fb1", "#4fe0d0", "#b68fff"];
const colorOf = (kind: number) => CHARM_COLORS[kind] ?? "#ffffff";

interface Refs {
  board: { current: BoardHandle | null };
  particles: { current: ParticleHandle | null };
  reduce: { current: boolean };
  t: { current: Dict };
  score: { current: ScoreHandle | null };
  dudu: { current: PalHandle | null };
  bubu: { current: PalHandle | null };
  duo: { current: DuoHandle | null };
}

const later = (fn: () => void, ms: number) => window.setTimeout(fn, ms);

/** How long the "+N" takes to reach the score: quick for a plain match, a little longer as the play gets bigger. */
const flightMs = (level: number) => 380 + level * 55;

/** Connects the controller's effect requests to the board, the particle canvas, sound and haptics. */
export function makeFx(refs: Refs): Fx {
  /** The word, and the sparks that belong to it. The tiers differ in motion and light, not in how much room they take. */
  const showCallout = (co: Callout, top: number, bottom: number, c: number) => {
    const b = refs.board.current;
    if (!b) return;
    const text = refs.t.current.callout(co.pool, co.index);
    const at = b.callout(text, co.level, top, bottom, c);
    const p = refs.particles.current;
    if (!at || !p) return;
    const size = b.cellSize();
    const celebrate = co.pool === "win" || co.pool === "star";
    if (co.level === 1) p.sparkle(at.x, at.y, "#ffc9de", 2, size * 0.7);
    else if (co.level === 2) p.sparkle(at.x, at.y, "#ffe08a", 4, size * 0.9);
    else if (co.level === 3) {
      p.sparkle(at.x, at.y, celebrate ? "#ffe36e" : "#ffb4e0", 7, size * 1.1);
      p.ring(at.x, at.y, celebrate ? "#ffe36e" : "#ffb4e0", size * 1.0);
    } else {
      p.sparkle(at.x, at.y, "#ffd98a", 10, size * 1.3);
      p.ring(at.x, at.y, "#ffffff", size * 1.1);
      later(() => p.ring(at.x, at.y, "#ff9bd6", size * 1.6), 110);
      p.confetti(co.pool === "win" ? 24 : 8);
    }
  };

  /** Dudu and Bubu: the nearer one answers first, the other follows. Quiet for small plays, a celebration for the big ones. */
  const reactPals = (ev: Reaction) => {
    if (refs.reduce.current) return;
    const { dudu, bubu, duo } = refs;
    const left = ev.x < 0.5;
    const near = left ? dudu.current : bubu.current;
    const far = left ? bubu.current : dudu.current;
    switch (ev.kind) {
      case "select":
        // nearly subliminal: a degree or two toward the finger
        near?.glance(ev.x);
        far?.glance(ev.x);
        break;
      case "match":
        // the dynamic is light: small plays are a glance, good ones a short hop by the nearer one, only the big ones get both
        if (ev.level === 0) near?.glance(ev.x);
        else if (ev.level === 1) near?.play("nod");
        else if (ev.level === 2) near?.play("hop");
        else if (ev.level === 3) {
          near?.play("hop");
          later(() => far?.play("nod"), 90);
        } else {
          near?.play("cheer", "heart");
          later(() => far?.play("cheer"), 90);
          later(() => duo.current?.peek(), 200);
        }
        break;
      case "oops":
        dudu.current?.play("oops", "drop");
        later(() => bubu.current?.play("tilt", "bang"), 80);
        break;
      case "low":
        dudu.current?.play("worry", "drop");
        break;
      case "win":
        dudu.current?.play("cheer", "heart");
        later(() => bubu.current?.play("cheer", "sparkle"), 90);
        later(() => duo.current?.peek(), 250);
        break;
      case "lose":
        dudu.current?.play("sad", "drop");
        later(() => bubu.current?.play("comfort", "heart"), 200);
        break;
    }
  };

  return {
    burst(r, c, kind, count) {
      const b = refs.board.current;
      if (!b) return;
      const p = b.cellPoint(r, c);
      refs.particles.current?.burst(p.x, p.y, colorOf(kind), count);
    },
    special(special: Special, r, c, cells) {
      const b = refs.board.current;
      const p = refs.particles.current;
      if (!b || !p) return;
      const at = b.cellPoint(r, c);
      const size = b.cellSize();
      if (special === "lineH") p.beam(b.cellPoint(r, 0).x + (b.cellPoint(r, 1).x - b.cellPoint(r, 0).x) * 3.5, at.y, true, size * 9, "#ffe98a");
      else if (special === "lineV") p.beam(at.x, b.cellPoint(0, c).y + (b.cellPoint(1, c).y - b.cellPoint(0, c).y) * 3.5, false, size * 9, "#ffe98a");
      else if (special === "bomb") p.ring(at.x, at.y, "#ff7ab8", size * 1.6);
      else if (special === "color") {
        p.ring(at.x, at.y, "#ffffff", size * 2.4);
        for (const [rr, cc] of cells.slice(0, 18)) {
          const q = b.cellPoint(rr, cc);
          p.burst(q.x, q.y, "#ffffff", 3);
        }
      }
    },
    callout(co, top, bottom, c) {
      showCallout(co, top, bottom, c);
    },
    /**
     * One event, in order: the board answers first (word, light, rim), the points are born at the match and
     * fly to the score, the score punches when they arrive, and the characters answer a beat after the board.
     */
    impact(ev) {
      const b = refs.board.current;
      if (!b) return;
      if (ev.callout) {
        const c = ev.callout;
        // MEGA gets a beat of visual silence: the rings and the pulse go off first, the word arrives ~170ms later
        if (c.pool === "mega" && !refs.reduce.current) {
          const p = refs.particles.current;
          const pt = b.cellPoint(ev.row, ev.col);
          p?.ring(pt.x, pt.y, "#ffffff", b.cellSize() * 1.2);
          later(() => showCallout(c, ev.top, ev.bottom, ev.col), 170);
        } else showCallout(c, ev.top, ev.bottom, ev.col);
      }
      if (ev.level >= 1) {
        b.glow(ev.level);
        if (!refs.reduce.current) pulseWorld(ev.level);
      }
      if (ev.delta > 0) {
        const target = refs.score.current?.point() ?? null;
        const ms = flightMs(ev.level);
        b.floatText(`+${ev.delta}`, ev.row, ev.col, ev.level, target, ms);
        if (ev.level >= 1 && target && refs.particles.current) {
          const from = b.cellPoint(ev.row, ev.col);
          refs.particles.current.fly(from.x, from.y, target.x, target.y, ev.level >= 3 ? "#ffb4e0" : "#ffe3a0", ev.level >= 3 ? 3 : ev.level >= 2 ? 2 : 1);
        }
        later(() => {
          refs.score.current?.pop(ev.level);
          if (ev.level >= 1) playSfx("tick", Math.min(ev.level - 1, 2));
        }, ms * 0.95);
      }
      // the characters answer 50-90ms after the board, never on the same frame
      later(() => reactPals({ kind: "match", level: ev.level, combo: ev.combo, x: ev.x }), 70);
    },
    star(index) {
      const at = refs.score.current?.starPoint(index);
      const p = refs.particles.current;
      if (!at || !p) return;
      // the first star is a small celebration, the third a real one
      p.sparkle(at.x, at.y, "#ffe36e", 5 + index * 3, 26 + index * 10);
      p.ring(at.x, at.y, "#ffe36e", 20 + index * 14);
      if (index === 2) later(() => p.confetti(18), 120);
    },
    glow(level) {
      refs.board.current?.glow(level);
      if (!refs.reduce.current) pulseWorld(level);
    },
    react(ev) {
      reactPals(ev);
    },
    shake(strength) {
      if (!refs.reduce.current) refs.board.current?.shake(strength);
    },
    sfx(name, n) {
      playSfx(name as SfxName, n);
    },
    haptic(name) {
      haptic(name as Haptic, refs.reduce.current);
    },
  };
}
