/** How loud a cascade is. Drives particles, banner, sound and haptics. 0 = a plain match. */
export type ComboTier = 0 | 1 | 2 | 3;

export function comboTier(combo: number): ComboTier {
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  if (combo >= 2) return 1;
  return 0;
}
