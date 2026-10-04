// Sprite boxes are percentages of the original 1600 x 1067 illustration the sprites were
// cut from. They keep the eyelid overlays lined up with Dudu's eyes.
export type Box = { x: number; y: number; w: number; h: number };

export const SCENE = {
  width: 1600,
  height: 1067,
  sprites: {
    dudu: { x: 19.5, y: 17.994, w: 40, h: 61.012 } satisfies Box,
    bubu: { x: 78, y: 39.925, w: 16, h: 20.15 } satisfies Box,
    eyeLeft: { x: 25.5, y: 44.611, w: 5.375, h: 11.153 } satisfies Box,
    eyeRight: { x: 37.063, y: 45.08, w: 6.75, h: 12.371 } satisfies Box,
  },
  src: {
    /** Only used for the round face crops (DuduAvatar). */
    small: "/images/dudu-hero-1000.webp",
    dudu: "/images/sprites/dudu.webp",
    duduSmall: "/images/sprites/dudu-sm.webp",
    bubu: "/images/sprites/bubu.webp",
    bubuSmall: "/images/sprites/bubu-sm.webp",
    eyeLeft: "/images/sprites/eyelid-left.webp",
    eyeRight: "/images/sprites/eyelid-right.webp",
  },
} as const;

/** CSS positioning for a box, in percent of its parent. */
export function place(box: Box, parent?: Box) {
  const p = parent ?? { x: 0, y: 0, w: 100, h: 100 };
  return {
    position: "absolute" as const,
    left: `${((box.x - p.x) / p.w) * 100}%`,
    top: `${((box.y - p.y) / p.h) * 100}%`,
    width: `${(box.w / p.w) * 100}%`,
    height: `${(box.h / p.h) * 100}%`,
  };
}
