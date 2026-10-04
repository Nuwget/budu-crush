import type { ButtonHTMLAttributes } from "react";

/** The game's pill button. `solid` is the one primary action on a screen. */
export function Button({ variant = "ghost", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" }) {
  return <button type="button" className={`gbtn gbtn-${variant} ${className}`} {...rest} />;
}

/** A round 44px+ icon button. `label` is the accessible name. */
export function IconButton({ label, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5 8 12l7 7" />
  </svg>
);

export const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
  </svg>
);

export const HeartIcon = ({ size = 16 }: { size?: number }) => <span className="charm-heart heart-icon" style={{ width: size, height: size }} aria-hidden="true" />;
