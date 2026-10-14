// QA tool: finds the longest cascade a legal move can start (greedy play over many seeds) and saves it as JSON.
//   node scripts/cascade-search.ts <out.json>   then   node scripts/qa-cascade.mjs <dir containing cascade.json> (needs a NEXT_PUBLIC_QA=1 build)
import type { GameState, Pos } from "../src/game/engine/types.ts";
import { createState } from "../src/game/engine/init.ts";
import { resolveSwap } from "../src/game/engine/resolve.ts";
import { isLegalSwap } from "../src/game/engine/moves.ts";
import { getLevel } from "../src/game/levels/index.ts";
import { writeFileSync } from "node:fs";
let best = { chain: 0, json: "", level: 0 };
for (let lv = 3; lv <= 30; lv++) for (let seed = 1; seed <= 300; seed++) {
  const base = getLevel(lv);
  let s: GameState = createState({ ...base, seed: base.seed + seed * 7919 });
  for (let m = 0; m < 25 && s.status === "playing"; m++) {
    let pick: [Pos, Pos] | null = null; let pickGain = -1;
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
      const a: Pos = [r, c], b: Pos = [r + dr, c + dc];
      if (b[0] >= s.rows || b[1] >= s.cols || !isLegalSwap(s.board, a, b)) continue;
      const res = resolveSwap(s, a, b);
      const chain = res.steps.filter((x) => x.t === "clear").length;
      if (chain > best.chain) { best = { chain, level: lv, json: JSON.stringify({ state: s, a, b }) }; }
      const gain = res.state.score - s.score;
      if (gain > pickGain) { pickGain = gain; pick = [a, b]; }
    }
    if (!pick) break;
    s = resolveSwap(s, pick[0], pick[1]).state;
  }
}
console.log("best chain", best.chain, "level", best.level);
writeFileSync(process.argv[2], best.json);
