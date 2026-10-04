import type { LevelDef } from "../../engine/types.ts";

// Charm kinds: 0 moon, 1 star, 2 cloud, 3 heart, 4 crystal, 5 flower.
const FULL8 = Array(8).fill("........");

/** Hand-authored opening levels. Later levels come from generator.ts. */
export const WORLD1: LevelDef[] = [
  {
    id: 1,
    layout: Array(7).fill("......."),
    kinds: [0, 1, 2, 3],
    seed: 101,
    moves: 20,
    objective: { type: "score", target: 3000 },
    stars: [3000, 5000, 8000],
    specials: true,
    tutorial: true,
  },
  {
    id: 2,
    layout: FULL8,
    kinds: [0, 1, 2, 3],
    seed: 202,
    moves: 25,
    objective: { type: "collect", kind: 1, count: 20 },
    stars: [1800, 2800, 4000],
    specials: true,
  },
  {
    id: 3,
    layout: ["........", "........", "..iiii..", "..iiii..", "..iiii..", "..iiii..", "........", "........"],
    kinds: [0, 1, 2, 3, 4],
    seed: 303,
    moves: 24,
    objective: { type: "ice" },
    stars: [2600, 3800, 5200],
    specials: true,
  },
  {
    id: 4,
    layout: ["##....##", "#......#", "........", "........", "........", "........", "#......#", "##....##"],
    kinds: [0, 1, 2, 3, 4],
    seed: 404,
    moves: 22,
    objective: { type: "score", target: 4500 },
    stars: [4500, 7000, 11000],
    specials: true,
  },
  {
    id: 5,
    layout: FULL8,
    kinds: [0, 1, 2, 3, 4],
    seed: 505,
    moves: 22,
    objective: { type: "collect", kind: 3, count: 26 },
    stars: [2400, 3600, 5000],
    specials: true,
  },
  {
    id: 6,
    layout: ["........", "........", "iiiiiiii", "........", "........", "iiiiiiii", "........", "........"],
    kinds: [0, 1, 2, 3, 4, 5],
    seed: 606,
    moves: 32,
    objective: { type: "ice" },
    stars: [3200, 4600, 6200],
    specials: true,
  },
];
