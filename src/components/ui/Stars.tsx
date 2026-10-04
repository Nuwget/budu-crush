import type { CSSProperties } from "react";

/** Three pixel stars; `n` of them are lit. Each star is the same art as the star charm. */
export function Stars({ n, size = 28, className = "", label }: { n: number; size?: number; className?: string; label?: string }) {
  return (
    <span className={`stars ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={`star-icon charm-star ${i < n ? "is-lit" : ""}`} style={{ width: size, height: size } as CSSProperties} />
      ))}
    </span>
  );
}
