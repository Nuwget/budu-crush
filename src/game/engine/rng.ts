// mulberry32 with an externally held state, so a GameState is fully serialisable and
// the same level seed plus the same swaps always produce the same steps.

/** Returns [value in 0..1, next state]. */
export function next(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** A tiny stateful wrapper for code that draws several values in a row. */
export class Rng {
  state: number;
  constructor(state: number) {
    this.state = state | 0;
  }
  float(): number {
    const [v, s] = next(this.state);
    this.state = s;
    return v;
  }
  int(n: number): number {
    return Math.floor(this.float() * n);
  }
  pick<T>(list: readonly T[]): T {
    return list[this.int(list.length)];
  }
}
