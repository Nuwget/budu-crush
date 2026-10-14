"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useT } from "@/hooks/useT";
import type { Lang } from "@/i18n";
import type { MotionPref } from "@/state/persistence";
import { actions, useSaved } from "@/state/store";
import { playSfx } from "@/lib/audio/sfx";

const LANGS: { lang: Lang; label: string }[] = [
  { lang: "pt", label: "Português" },
  { lang: "en", label: "English" },
];
const MOTIONS: MotionPref[] = ["system", "reduce", "full"];

const ICONS = {
  music: "M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z",
  sfx: "M4 9v6h4l5 4V5L8 9H4Zm12 0a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12",
  haptics: "M8 3h8v18H8zM4 8v8M20 8v8",
} as const;

/** A big square switch: lit when on. One tap, no reading. */
function Switch({ icon, label, on, onChange }: { icon: keyof typeof ICONS; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="switch-card" onClick={() => onChange(!on)}>
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONS[icon]} />
        {!on && <path d="M3 3l18 18" />}
      </svg>
      <span>{label}</span>
    </button>
  );
}

/** Music, effects, vibration, language and motion; plus restart / map when opened mid-game. */
export function SettingsSheet({ open, onClose, reduce, onRestart, onMap }: { open: boolean; onClose: () => void; reduce: boolean; onRestart?: () => void; onMap?: () => void }) {
  const t = useT();
  const { settings, lang } = useSaved();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Sheet
      open={open}
      title={t.settingsTitle}
      closeLabel={t.close}
      reduce={reduce}
      onClose={() => {
        setConfirmReset(false);
        onClose();
      }}
    >
      <div className="settings-list">
        {(onRestart || onMap) && (
          <div className="settings-actions">
            {onRestart && (
              <button type="button" className="pill-btn" onClick={onRestart}>
                {t.restart}
              </button>
            )}
            {onMap && (
              <button type="button" className="pill-btn" onClick={onMap}>
                {t.toMap}
              </button>
            )}
          </div>
        )}

        <div className="switch-grid">
          <Switch icon="music" label={t.music} on={settings.music} onChange={(v) => actions.setSetting("music", v)} />
          <Switch icon="sfx" label={t.sfx} on={settings.sfx} onChange={(v) => { actions.setSetting("sfx", v); if (v) setTimeout(() => playSfx("ui"), 60); }} />
          <Switch icon="haptics" label={t.haptics} on={settings.haptics} onChange={(v) => actions.setSetting("haptics", v)} />
        </div>

        <fieldset className="seg">
          <legend className="seg-legend">{t.motion}</legend>
          <div className="seg-row" role="radiogroup" aria-label={t.motion}>
            {MOTIONS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={settings.motion === m} className="seg-btn" onClick={() => actions.setMotion(m)}>
                {t.motionOptions[m]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="seg">
          <legend className="seg-legend">{t.language}</legend>
          <div className="seg-row" role="radiogroup" aria-label={t.language}>
            {LANGS.map((l) => (
              <button key={l.lang} type="button" role="radio" aria-checked={lang === l.lang} lang={l.lang === "pt" ? "pt-BR" : "en"} className="seg-btn" onClick={() => actions.setLang(l.lang)}>
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          className={`reset-btn ${confirmReset ? "is-armed" : ""}`}
          onClick={() => {
            if (confirmReset) {
              actions.resetProgress();
              setConfirmReset(false);
            } else setConfirmReset(true);
          }}
        >
          {confirmReset ? t.resetConfirm : t.resetProgress}
        </button>
      </div>
    </Sheet>
  );
}
