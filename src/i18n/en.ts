// English is the source of truth: pt.ts is typed against it, so a missing key is a compile error.
export const en = {
  htmlLang: "en",
  title: "Dudu & Bubu",
  tagline: "A cozy midnight puzzle",
  play: "Play",
  continueLevel: (n: number) => `Continue · Level ${n}`,
  map: "Map",
  settings: "Settings",
  back: "Back",
  close: "Close",
  level: "Level",
  levelN: (n: number) => `Level ${String(n).padStart(2, "0")}`,
  score: "Score",
  moves: "Moves",
  best: "Best",
  lives: (n: number) => `${n} lives`,
  pause: "Pause",
  resume: "Keep playing",
  restart: "Restart level",
  toMap: "Back to the map",

  objective: {
    score: (n: number) => `Reach ${n.toLocaleString("en")} points`,
    collect: (n: number, name: string) => `Collect ${n} ${name}`,
    ice: "Melt all the frost",
  },
  objectiveProgress: (done: number, total: number) => `${Math.min(done, total)} / ${total}`,
  frostLeft: (n: number) => `${n} left`,

  charms: ["moons", "stars", "clouds", "hearts", "crystals", "flowers"],
  charmOne: ["Moon", "Star", "Cloud", "Heart", "Crystal", "Flower"],
  special: {
    none: "",
    lineH: "row clearer",
    lineV: "column clearer",
    bomb: "bomb",
    color: "colour orb",
  },
  cellLabel: (charm: string, special: string, r: number, c: number) => `${charm}${special ? `, ${special}` : ""}, row ${r}, column ${c}`,
  boardLabel: "Puzzle board",
  boardHelp: "Use the arrow keys to move, Enter to pick a charm, then an arrow key to swap it.",
  cursor: (label: string) => label,
  selected: (label: string) => `${label} picked`,

  tutorialSwap: "Drag to swap",
  tutorialMatch: "Line up 3 charms that match",
  tutorialDudu: "Swap two neighbours to line up 3 alike.",

  combo: ["", "Sweet!", "Lovely!", "Magical!", "Moonstruck!"],
  noMoves: "No moves left. Shuffling…",

  win: {
    title: "Level complete",
    cozy: "Dudu is so proud.",
    score: "Score",
    best: "Best score",
    newBest: "New best!",
    cont: "Continue",
    again: "Play again",
  },
  lose: {
    title: "Almost there",
    cozy: "That one was sleepy. Bubu says: one more try.",
    retry: "Try again",
  },

  settingsTitle: "Settings",
  music: "Music",
  sfx: "Sound effects",
  haptics: "Vibration",
  language: "Language",
  motion: "Reduced motion",
  motionOptions: { system: "Auto", reduce: "On", full: "Off" },
  on: "On",
  off: "Off",
  resetProgress: "Reset progress",
  resetConfirm: "Tap again to erase progress",

  mapTitle: "Night city",
  levelLocked: "Locked",
  levelStars: (n: number) => `${n} of 3 stars`,
  dudu: "Dudu",
  bubu: "Bubu",
  loading: "Loading…",
} as const;

export type Dict = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : (typeof en)[K] extends readonly string[]
      ? readonly string[]
      : (typeof en)[K] extends string
        ? string
        : { [P in keyof (typeof en)[K]]: (typeof en)[K][P] extends (...args: infer A) => string ? (...args: A) => string : string };
};
