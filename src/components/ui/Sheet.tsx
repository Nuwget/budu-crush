"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { IconButton } from "./Button";

/** A bottom sheet over the current screen. Esc and the backdrop close it; focus moves in. */
export function Sheet({ open, title, closeLabel, onClose, children, reduce }: { open: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode; reduce: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="sheet-root">
          <m.div className="sheet-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }} />
          <m.div
            ref={panel}
            className="sheet glass"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sheet-head">
              <h2 className="sheet-title">{title}</h2>
              <IconButton label={closeLabel} onClick={onClose}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </IconButton>
            </div>
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
