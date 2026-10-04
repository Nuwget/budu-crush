export const POINTS_PER_TILE = 40;
export const SPECIAL_BONUS = 60;
export const MAX_MULTIPLIER = 5;

/** Points for one clear wave. Combo 1 of a plain 3-match is 120, combo 2 is 240, and so on. */
export function waveScore(tiles: number, combo: number, specialsFired: number): number {
  const mult = Math.min(Math.max(combo, 1), MAX_MULTIPLIER);
  return (tiles * POINTS_PER_TILE + specialsFired * SPECIAL_BONUS) * mult;
}

/** 1..3 stars from the level's score thresholds; 0 below the first. */
export function starsFor(score: number, stars: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  return score >= stars[2] ? 3 : score >= stars[1] ? 2 : score >= stars[0] ? 1 : 0;
}

/**
 * Stars for a finished level. Score levels use the score thresholds. Collect and ice levels
 * end early, so they reward the moves left over: 40% or more is three stars, 20% two.
 */
export function levelStars(objectiveType: "score" | "collect" | "ice", score: number, thresholds: readonly [number, number, number], movesLeft: number, totalMoves: number): 1 | 2 | 3 {
  if (objectiveType === "score") return Math.max(1, starsFor(score, thresholds)) as 1 | 2 | 3;
  const f = movesLeft / totalMoves;
  return f >= 0.4 ? 3 : f >= 0.2 ? 2 : 1;
}
