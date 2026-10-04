"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BubuAvatar, DuduAvatar } from "@/components/characters/DuduAvatar";
import { useNav } from "@/app-shell/nav";
import { unlockAudio } from "@/lib/audio/engine";
import { playSfx } from "@/lib/audio/sfx";
import type { Lang } from "@/i18n";
import { actions } from "@/state/store";

const CHOICES: { lang: Lang; code: string; key: string; name: string; cta: string }[] = [
  { lang: "pt", code: "PT-BR", key: "P", name: "Português", cta: "Continuar em português" },
  { lang: "en", code: "EN", key: "E", name: "English", cta: "Continue in English" },
];

/**
 * The entrance. It is bilingual on purpose (the player has not chosen yet). Picking a card
 * unlocks audio, saves the language, and opens the game with the pixel wipe spreading from
 * the tap.
 */
export function LanguageScreen() {
  const nav = useNav();
  const [picked, setPicked] = useState<{ lang: Lang; x: number; y: number } | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus({ preventScroll: true });
  }, []);

  const pick = (lang: Lang, el: HTMLElement, e?: { clientX: number; clientY: number }) => {
    if (picked) return;
    const r = el.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX : r.left + r.width / 2;
    const y = e && e.clientY ? e.clientY : r.top + r.height / 2;
    setPicked({ lang, x, y });
    unlockAudio();
    playSfx("click");
    // the language is saved when the wipe has covered the screen, so the swap is one clean cut
    nav.go({ name: "home" }, { wipe: true, origin: [x / window.innerWidth, y / window.innerHeight], beforeSwap: () => actions.setLang(lang) });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = refs.current.findIndex((b) => b === document.activeElement);
    if (["ArrowDown", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      refs.current[(i + 1) % CHOICES.length]?.focus();
    } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
      e.preventDefault();
      refs.current[(i - 1 + CHOICES.length) % CHOICES.length]?.focus();
    } else {
      const k = CHOICES.findIndex((c) => c.key.toLowerCase() === e.key.toLowerCase());
      if (k >= 0 && refs.current[k]) pick(CHOICES[k].lang, refs.current[k]!);
    }
  };

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: nav.reduce ? { duration: 0 } : { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="screen screen-language" data-picked={picked?.lang} role="dialog" aria-modal="true" aria-label="Escolha o idioma / Choose your language" onKeyDown={onKeyDown}>
      <div className="gate-content">
        <motion.div className="flex items-end justify-center gap-4" {...rise(0.1)}>
          <div className="gate-avatar">
            <DuduAvatar size={104} />
          </div>
          <div className="gate-avatar gate-avatar-sm relative">
            <BubuAvatar size={54} />
            <span aria-hidden="true" className="gate-z">
              z
            </span>
            <span aria-hidden="true" className="gate-z gate-z2">
              z
            </span>
          </div>
        </motion.div>

        <motion.h1 className="gate-title" {...rise(0.22)}>
          Escolha o idioma
        </motion.h1>
        <motion.p className="gate-sub" {...rise(0.3)}>
          Choose your language
        </motion.p>

        <div className="gate-cards">
          {CHOICES.map((c, i) => (
            <motion.div key={c.lang} {...rise(0.42 + i * 0.1)}>
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                lang={c.lang === "pt" ? "pt-BR" : "en"}
                className="gate-card"
                data-lang={c.lang}
                data-current={i === 0 ? "true" : undefined}
                onPointerMove={onCardMove}
                onPointerLeave={onCardLeave}
                onClick={(e) => pick(c.lang, e.currentTarget, e)}
              >
                <span className="gate-shine" aria-hidden="true" />
                <span className="gate-card-top">
                  <span className="gate-code">{c.code}</span>
                  <span className="gate-arrow" aria-hidden="true">
                    →
                  </span>
                </span>
                <span className="gate-name">{c.name}</span>
                <span className="gate-card-bottom">
                  <span className="gate-cta">{c.cta}</span>
                  <kbd className="gate-kbd" aria-hidden="true">
                    {c.key}
                  </kbd>
                </span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
      {picked && !nav.reduce && <span aria-hidden="true" className="gate-ring" style={{ left: picked.x, top: picked.y }} />}
    </section>
  );
}

function onCardMove(e: React.PointerEvent<HTMLButtonElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  el.style.setProperty("--sx", `${e.clientX - r.left}px`);
  el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  el.style.setProperty("--rx", `${((0.5 - py) * 9).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${((px - 0.5) * 11).toFixed(2)}deg`);
}

function onCardLeave(e: React.PointerEvent<HTMLButtonElement>) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}
