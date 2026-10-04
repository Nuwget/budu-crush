"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { CSSProperties } from "react";

export interface FloatingTextHandle {
  add(text: string, xPct: number, yPct: number, tier: number): void;
}

interface Item {
  id: number;
  text: string;
  x: number;
  y: number;
  tier: number;
}

let counter = 0;

/** Score numbers that rise and fade. At most six at a time; each removes itself. */
export const FloatingText = forwardRef<FloatingTextHandle>(function FloatingText(_, ref) {
  const [items, setItems] = useState<Item[]>([]);
  useImperativeHandle(ref, () => ({
    add(text, x, y, tier) {
      const id = ++counter;
      setItems((list) => [...list.slice(-5), { id, text, x, y, tier }]);
      window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 1000);
    },
  }));
  return (
    <div className="floaters" aria-hidden="true">
      {items.map((i) => (
        <span key={i.id} className={`floater tier-${i.tier}`} style={{ left: `${i.x}%`, top: `${i.y}%` } as CSSProperties}>
          {i.text}
        </span>
      ))}
    </div>
  );
});
