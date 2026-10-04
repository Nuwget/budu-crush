import type { LevelDef } from "../engine/types.ts";
import { WORLD1 } from "./data/world1.ts";
import { generateLevel } from "./generator.ts";

export const TOTAL_LEVELS = 30;

export function getLevel(n: number): LevelDef {
  const id = Math.min(Math.max(Math.floor(n), 1), TOTAL_LEVELS);
  return WORLD1.find((l) => l.id === id) ?? generateLevel(id);
}
