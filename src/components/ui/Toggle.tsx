/** An on/off switch with a visible label. */
export function Toggle({ label, checked, onChange, onText, offText }: { label: string; checked: boolean; onChange: (v: boolean) => void; onText: string; offText: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="toggle-row" onClick={() => onChange(!checked)}>
      <span className="toggle-label">{label}</span>
      <span className="toggle-state">{checked ? onText : offText}</span>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-knob" />
      </span>
    </button>
  );
}
