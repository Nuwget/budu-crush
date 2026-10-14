import { memo } from "react";
import type { CSSProperties } from "react";
import type { Special } from "@/game/engine/types";
import { charmId } from "@/game/tiles/kinds";
import type { TileFx } from "@/game/controller";

interface Props {
  id: number;
  kind: number;
  special: Special;
  r: number;
  c: number;
  fx: TileFx;
  d: number;
  selected: boolean;
  hinted: boolean;
}

/**
 * One charm. Position is a CSS transform driven by --r/--c, so moving a tile is just a
 * variable change the compositor animates. Memoised on primitive props: a cascade only
 * re-renders the tiles that actually changed.
 */
export const Tile = memo(function Tile({ id, kind, special, r, c, fx, d, selected, hinted }: Props) {
  const cls = ["tile", fx && `fx-${fx}`, selected && "is-selected", hinted && "is-hint", special !== "none" && `is-${special}`].filter(Boolean).join(" ");
  return (
    <div className={cls} data-id={id} style={{ "--r": r, "--c": c, "--d": d, "--rot": (id % 5) - 2, "--ph": ((id * 37) % 100) / 100 } as CSSProperties}>
      <div className="tile-body">
        {special !== "none" && <div className={`tile-aura aura-${special}`} />}
        <div className={`tile-art charm-${charmId(kind)}`} />
        {(special === "lineH" || special === "lineV" || special === "bomb") && <div className={`tile-art tile-overlay overlay-${special}`} />}
      </div>
    </div>
  );
});
