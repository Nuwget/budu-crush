// Run with: node scripts/sim.ts [runsPerLevel]
// A greedy bot plays every level on many seeds. It checks the engine invariants after every
// move and prints the win rate and average moves left, to help balance the levels.
import assert from "node:assert/strict";
import type { GameState, Pos } from "../src/game/engine/types.ts";
import { createState } from "../src/game/engine/init.ts";
import { resolveSwap } from "../src/game/engine/resolve.ts";
import { findGroups } from "../src/game/engine/match.ts";
import { isLegalSwap } from "../src/game/engine/moves.ts";
import { Rng } from "../src/game/engine/rng.ts";
import { getLevel, TOTAL_LEVELS } from "../src/game/levels/index.ts";
import { levelStars } from "../src/game/scoring/score.ts";

const runs = Number(process.argv[2] ?? 30);

/** Pick the legal move that scores best right now, with a little noise so it is not perfect. */
function chooseMove(s: GameState, rng: Rng): [Pos, Pos] | null {
  let best: [Pos, Pos] | null = null;
  let bestScore = -1;
  for (let r = 0; r < s.rows; r++)
    for (let c = 0; c < s.cols; c++)
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        const a: Pos = [r, c];
        const b: Pos = [r + dr, c + dc];
        if (b[0] >= s.rows || b[1] >= s.cols || !isLegalSwap(s.board, a, b)) continue;
        const res = resolveSwap(s, a, b);
        const gain = res.state.score - s.score + (res.state.collected - s.collected) * 60 + (s.iceLeft - res.state.iceLeft) * 120 + rng.float() * 60;
        if (gain > bestScore) {
          bestScore = gain;
          best = [a, b];
        }
      }
  return best;
}

console.log("level  objective        win%   avg moves left   avg stars");
for (let n = 1; n <= TOTAL_LEVELS; n++) {
  const base = getLevel(n);
  let wins = 0;
  let left = 0;
  let stars = 0;
  let scoreSum = 0;
  for (let i = 0; i < runs; i++) {
    let s = createState({ ...base, seed: base.seed + i * 977 });
    const rng = new Rng(i + 1);
    const ids = new Set<number>();
    while (s.status === "playing") {
      const m = chooseMove(s, rng);
      assert.ok(m, `level ${n}: no move but still playing`);
      s = resolveSwap(s, m[0], m[1]).state;
      if (s.status === "playing") assert.equal(findGroups(s.board).length, 0, `level ${n}: match left at rest`);
      ids.clear();
      for (const cell of s.board.flat()) {
        assert.ok(cell.hole || cell.tile, `level ${n}: empty playable cell`);
        if (cell.tile) {
          assert.ok(!ids.has(cell.tile.id), `level ${n}: duplicate id`);
          ids.add(cell.tile.id);
        }
      }
    }
    if (s.status === "won") {
      wins++;
      left += s.moves;
      stars += levelStars(base.objective.type, s.score, base.stars, s.moves, base.moves);
      scoreSum += s.score;
    }
  }
  const o = base.objective;
  const label = o.type === "score" ? `score ${o.target}` : o.type === "collect" ? `collect ${o.count}` : "ice";
  console.log(`${String(n).padStart(3)}    ${label.padEnd(16)} ${String(Math.round((wins / runs) * 100)).padStart(3)}%   ${(wins ? left / wins : 0).toFixed(1).padStart(6)}           ${(wins ? stars / wins : 0).toFixed(2)}   avg score ${wins ? Math.round(scoreSum / wins) : 0}`);
}
