"use client";

import { createContext, useContext } from "react";
import type { ScreenState } from "./screens";

export interface GoOptions {
  /** Where the pixel wipe spreads from, as fractions of the viewport. */
  origin?: [number, number];
  /** Cover the screen with the pixel wipe (big moments); otherwise a quick cross-fade. */
  wipe?: boolean;
  /** Runs while the screen is fully covered, right before the new screen appears. */
  beforeSwap?: () => void;
}

export interface Nav {
  screen: ScreenState;
  go(next: ScreenState, opts?: GoOptions): void;
  /** Leave the game for the map, through browser history so the Back button agrees. */
  exitGame(): void;
  openSettings(): void;
  reduce: boolean;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav outside <GameRoot>");
  return nav;
}
