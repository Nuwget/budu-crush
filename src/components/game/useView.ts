"use client";

import { useSyncExternalStore } from "react";
import type { GameController, View } from "@/game/controller";

/**
 * Subscribe to one slice of the controller's view. Slices keep their identity until they
 * change, so a component re-renders only when its own slice does.
 */
export function useView<T>(ctrl: GameController, select: (v: View) => T): T {
  return useSyncExternalStore(
    ctrl.subscribe,
    () => select(ctrl.getView()),
    () => select(ctrl.getView()),
  );
}
