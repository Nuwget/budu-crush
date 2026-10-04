"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Toggle } from "@/components/ui/Toggle";
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
        <Toggle label={t.music} checked={settings.music} onText={t.on} offText={t.off} onChange={(v) => actions.setSetting("music", v)} />
        <Toggle label={t.sfx} checked={settings.sfx} onText={t.on} offText={t.off} onChange={(v) => { actions.setSetting("sfx", v); if (v) setTimeout(() => playSfx("click"), 60); }} />
        <Toggle label={t.haptics} checked={settings.haptics} onText={t.on} offText={t.off} onChange={(v) => actions.setSetting("haptics", v)} />

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

        {(onRestart || onMap) && (
          <div className="settings-actions">
            {onRestart && <Button onClick={onRestart}>{t.restart}</Button>}
            {onMap && <Button onClick={onMap}>{t.toMap}</Button>}
          </div>
        )}

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
