import type { LevelDef } from "../engine/types.ts";

/** Returns a list of problems with a level definition (empty when it is fine). */
export function validateLevel(level: LevelDef): string[] {
  const errors: string[] = [];
  const rows = level.layout.length;
  const cols = level.layout[0]?.length ?? 0;
  if (rows < 4 || cols < 4) errors.push("board too small");
  if (rows > 9 || cols > 9) errors.push("board too large for a phone");
  if (level.layout.some((r) => r.length !== cols)) errors.push("ragged layout");
  if (level.layout.some((r) => /[^.#iI]/.test(r))) errors.push("unknown layout character");
  if (level.kinds.length < 4 || level.kinds.length > 6) errors.push("need 4 to 6 kinds");
  if (new Set(level.kinds).size !== level.kinds.length) errors.push("duplicate kinds");
  if (level.moves < 1) errors.push("no moves");
  if (!(level.stars[0] <= level.stars[1] && level.stars[1] <= level.stars[2])) errors.push("star thresholds must rise");
  const o = level.objective;
  if (o.type === "collect" && !level.kinds.includes(o.kind)) errors.push("collect kind not in the level");
  if (o.type === "ice" && !level.layout.some((r) => /[iI]/.test(r))) errors.push("ice objective without ice");
  // every column must be one contiguous playable segment
  for (let c = 0; c < cols; c++) {
    let segments = 0;
    let inside = false;
    for (let r = 0; r < rows; r++) {
      const playable = level.layout[r]?.[c] !== "#";
      if (playable && !inside) segments++;
      inside = playable;
    }
    if (segments > 1) errors.push(`column ${c} is split by a hole`);
  }
  return errors;
}
