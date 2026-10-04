import type { WorldMood } from "@/components/world/World";

export type ScreenState =
  | { name: "language" }
  | { name: "home" }
  | { name: "map" }
  | { name: "game"; level: number; attempt: number }
  | { name: "victory"; level: number; score: number; stars: number; best: number; isBest: boolean }
  | { name: "defeat"; level: number; score: number };

export function moodFor(screen: ScreenState): WorldMood {
  switch (screen.name) {
    case "language":
      return "gate";
    case "game":
      return "play";
    default:
      return screen.name;
  }
}

export const isInGame = (s: ScreenState) => s.name === "game" || s.name === "victory" || s.name === "defeat";
