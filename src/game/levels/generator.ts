import type { LevelDef, Objective } from "../engine/types.ts";
import { Rng } from "../engine/rng.ts";

const MASKS: string[][] = [
  Array(8).fill("........"),
  ["#......#", "........", "........", "........", "........", "........", "........", "#......#"],
  ["##....##", "#......#", "........", "........", "........", "........", "#......#", "##....##"],
  ["...##...", "........", "........", "........", "........", "........", "........", "........"],
];

const ICE: string[][] = [
  ["........", "........", "..iiii..", "..iiii..", "..iiii..", "..iiii..", "........", "........"],
  ["...ii...", "...ii...", "...ii...", "iiiiiiii", "iiiiiiii", "...ii...", "...ii...", "...ii..."],
  ["........", "iiiiiiii", "........", "........", "........", "........", "iiiiiiii", "........"],
];

/** A deterministic level for any number. The curve rises gently and repeats a few shapes. */
export function generateLevel(n: number): LevelDef {
  const rng = new Rng(n * 7919 + 13);
  const tier = Math.min(Math.floor((n - 7) / 4), 6);
  const kindCount = n < 12 ? 5 : 6;
  const kinds = Array.from({ length: kindCount }, (_, i) => i);
  const objective: Objective =
    n % 3 === 1
      ? { type: "ice" }
      : n % 3 === 2
        ? { type: "collect", kind: rng.int(kindCount), count: 22 + tier * 2 }
        : { type: "score", target: 4000 + tier * 500 };
  const layout = objective.type === "ice" ? ICE[rng.int(ICE.length)] : MASKS[rng.int(MASKS.length)];
  const moves = objective.type === "ice" ? 32 : Math.max(22, 27 - Math.floor(tier / 2));
  const target = objective.type === "score" ? objective.target : 2600 + tier * 600;
  return {
    id: n,
    layout,
    kinds,
    seed: 1000 + n * 31,
    moves,
    objective,
    stars: [target, Math.round(target * 1.5), Math.round(target * 2.2)],
    specials: true,
  };
}
