/** The six charms. The index is the tile `kind`; -1 is the colour orb. */
export const CHARM_COUNT = 6;
export const CHARM_IDS = ["moon", "star", "cloud", "heart", "crystal", "flower"] as const;
export type CharmId = (typeof CHARM_IDS)[number];

export const charmId = (kind: number): CharmId | "orb" => (kind < 0 ? "orb" : CHARM_IDS[kind]);
