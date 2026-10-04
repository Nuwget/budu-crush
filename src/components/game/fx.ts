import type { Fx } from "@/game/controller";
import type { Special } from "@/game/engine/types";
import type { ParticleHandle } from "@/components/effects/ParticleCanvas";
import { haptic, type Haptic } from "@/lib/haptics";
import { playSfx, type SfxName } from "@/lib/audio/sfx";
import type { BoardHandle } from "./Board";

export const CHARM_COLORS = ["#ffe3a0", "#ffc83d", "#d2e6ff", "#ff6fb1", "#4fe0d0", "#b68fff"];
const colorOf = (kind: number) => CHARM_COLORS[kind] ?? "#ffffff";

interface Refs {
  board: { current: BoardHandle | null };
  particles: { current: ParticleHandle | null };
  reduce: { current: boolean };
}

/** Connects the controller's effect requests to the board, the particle canvas, sound and haptics. */
export function makeFx(refs: Refs): Fx {
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
    floatText(text, r, c, tier) {
      refs.board.current?.floatText(text, r, c, tier);
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
