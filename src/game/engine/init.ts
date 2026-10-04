import type { GameState, LevelDef } from "./types.ts";
import { Rng } from "./rng.ts";
import { countIce, parseLayout } from "../board/board.ts";
import { fillBoard } from "./moves.ts";

/** A fresh game: a seeded board with no matches and at least one legal move. */
export function createState(level: LevelDef): GameState {
  const board = parseLayout(level.layout);
  const rng = new Rng(level.seed);
  let nextId = 1;
  fillBoard(board, level.kinds, rng, () => nextId++);
  return {
    rows: board.length,
    cols: board[0].length,
    board,
    level,
    rng: rng.state,
    nextId,
    moves: level.moves,
    score: 0,
    collected: 0,
    iceLeft: countIce(board),
    status: "playing",
  };
}
