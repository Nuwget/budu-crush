// Pure game types. Nothing in src/game may import React, the DOM or Math.random.

/** 0..5 are the normal charms; -1 is the colour orb (it never matches by kind). */
export type Kind = number;
export const COLOR_KIND = -1;

export type Special = "none" | "lineH" | "lineV" | "bomb" | "color";

export interface Tile {
  /** Stable for the tile's whole life; the UI keys its elements on it. */
  id: number;
  kind: Kind;
  special: Special;
}

export interface Cell {
  tile: Tile | null;
  hole: boolean;
  /** 0 = none, 1..2 = layers of frost under the tile. */
  ice: number;
}

export type Board = Cell[][];
export type Pos = readonly [row: number, col: number];

export type Objective =
  | { type: "score"; target: number }
  | { type: "collect"; kind: Kind; count: number }
  | { type: "ice" };

export interface LevelDef {
  id: number;
  /** One string per row. `.` normal, `#` hole, `i` ice, `I` double ice. */
  layout: string[];
  kinds: Kind[];
  seed: number;
  moves: number;
  objective: Objective;
  /** Score thresholds for 1, 2 and 3 stars. */
  stars: [number, number, number];
  /** Whether 4/5/L/T matches create special tiles. */
  specials: boolean;
  /** Level 1 teaches the swap gesture. */
  tutorial?: boolean;
}

export type Status = "playing" | "won" | "lost";

export interface GameState {
  rows: number;
  cols: number;
  board: Board;
  level: LevelDef;
  rng: number;
  nextId: number;
  moves: number;
  score: number;
  collected: number;
  iceLeft: number;
  status: Status;
}

export interface ClearedTile {
  id: number;
  r: number;
  c: number;
  kind: Kind;
  special: Special;
}

export interface FallMove {
  id: number;
  r: number;
  c: number;
}

export interface NewTile {
  id: number;
  kind: Kind;
  special: Special;
  r: number;
  c: number;
  /** Row the tile starts from (negative or above the segment) before dropping. */
  fromR: number;
}

/**
 * The engine resolves a whole move at once and returns an ordered list of steps.
 * Each step is a self-contained delta, so the UI can replay it with animation.
 */
export type Step =
  | { t: "swap"; a: Pos; b: Pos; moves: number }
  | { t: "invalid"; a: Pos; b: Pos }
  | { t: "activate"; r: number; c: number; special: Special; cells: Pos[] }
  | { t: "convert"; tiles: { id: number; r: number; c: number; special: Special }[] }
  | { t: "clear"; tiles: ClearedTile[]; combo: number }
  | { t: "damage"; r: number; c: number; ice: number }
  | { t: "spawn"; tile: NewTile }
  | { t: "score"; delta: number; at: Pos; combo: number; score: number; collected: number; iceLeft: number }
  | { t: "fall"; moves: FallMove[] }
  | { t: "refill"; tiles: NewTile[] }
  | { t: "shuffle"; tiles: NewTile[] }
  | { t: "end"; status: Status };

export interface Resolution {
  steps: Step[];
  state: GameState;
}
