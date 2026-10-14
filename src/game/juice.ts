// The reward language: decides which callout (if any) a clear wave earns, and how loud it is.
// Pure and deterministic: picks come from a seeded generator, nothing reads a clock.
//
// The ladder inside one cascade (the engine tells us up front how many waves a move has):
//   wave 1 "Delícia!" · wave 2 "Muito bom!" · wave 3 "Incrível!" · wave 4 "Sensacional!" · 5+ "MEGA COMBO!"
// A lone three-match gets no word at all; a four gets "Delícia!", a five "Perfeito!".

/** Text pools. The UI dictionaries hold one string per index, so sizes live here. */
export const POOL_SIZE = {
  delicia: 4,
  muito: 3,
  incrivel: 3,
  perfect: 3,
  sensa: 3,
  mega: 3,
  special: 3,
  star: 3,
  win: 2,
} as const;
export type Pool = keyof typeof POOL_SIZE;

/** "Delícia!" is the signature word: it comes up more often than its siblings. "QUE DELÍCIA!" is the rare MEGA surprise. */
const WEIGHTS: Partial<Record<Pool, readonly number[]>> = { delicia: [5, 1, 1, 1], mega: [8, 1, 1] };

/** 0 nothing much · 1 lively · 2 expressive · 3 theatrical · 4 "wow". */
export type Intensity = 0 | 1 | 2 | 3 | 4;

export interface Callout {
  pool: Pool;
  index: number;
  level: Intensity;
}

type Special = "lineH" | "lineV" | "bomb" | "color";

export interface Wave {
  /** Tiles cleared by this wave. */
  size: number;
  /** Cascade step, 1 for the player's own match. */
  combo: number;
  /** How many clear waves the whole move has. */
  chain?: number;
  /** A special tile fired just before this wave. */
  special?: Special;
}

export class Juice {
  private rng: () => number;
  private last: Partial<Record<Pool, number>> = {};

  constructor(rng: () => number) {
    this.rng = rng;
  }

  /** How strongly a wave should be celebrated, with or without a word. */
  static intensity(w: Wave): Intensity {
    const bySize = w.size >= 5 ? 3 : w.size === 4 ? 1 : 0;
    const byCombo = w.combo >= 2 ? Math.min(w.combo, 4) : (w.chain ?? 1) >= 2 ? 1 : 0;
    const bySpecial = w.special === "color" || w.special === "bomb" ? 3 : w.special ? 2 : 0;
    return Math.max(bySize, byCombo, bySpecial) as Intensity;
  }

  wave(w: Wave): Callout | null {
    const level = Juice.intensity(w);
    let pool: Pool;
    if (w.combo >= 5) pool = "mega";
    else if (w.combo === 4) pool = "sensa";
    else if (w.combo === 3) pool = "incrivel";
    else if (w.combo === 2) pool = "muito";
    else if (w.special) pool = "special";
    else if (w.size >= 5) pool = "perfect";
    else if (w.size === 4 || (w.chain ?? 1) >= 2) pool = "delicia";
    else return null;
    return { pool, index: this.pick(pool), level: level === 0 ? 1 : level };
  }

  /** A star threshold was just passed. */
  star(): Callout {
    return { pool: "star", index: this.pick("star"), level: 3 };
  }

  /** The level is won. Three stars earns the bigger words. */
  win(threeStars: boolean): Callout {
    return { pool: "win", index: threeStars ? 1 : 0, level: 4 };
  }

  /** A weighted random index that is never the one used last time for this pool. */
  private pick(pool: Pool): number {
    const n = POOL_SIZE[pool];
    const w = WEIGHTS[pool] ?? Array.from({ length: n }, () => 1);
    const prev = this.last[pool];
    let total = 0;
    for (let i = 0; i < n; i++) if (i !== prev) total += w[i];
    let x = this.rng() * total;
    let pick = 0;
    for (let i = 0; i < n; i++) {
      if (i === prev) continue;
      pick = i;
      x -= w[i];
      if (x < 0) break;
    }
    this.last[pool] = pick;
    return pick;
  }
}
