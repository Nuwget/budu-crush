export type DuduMood = "calm" | "smile" | "bright" | "cheer" | "sad" | "oops";

const INK = "#3b1450";

/** A four-point sparkle centred on (0,0). */
function Sparkle({ x, y, s = 1, delay = 0, fill = "#fff6c9" }: { x: number; y: number; s?: number; delay?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="dudu-sparkle" style={{ animationDelay: `${delay}s` }} fill={fill} d="M0 -22 L5 -5 L22 0 L5 5 L0 22 L-5 5 L-22 0 L-5 -5 Z" />
    </g>
  );
}

/** Soft patches that hide the painted-on eyes and mouth so a new expression can be drawn. */
function Defs() {
  return (
    <defs>
      <radialGradient id="dd-skin-l">
        <stop offset="0.62" stopColor="#ad65d4" />
        <stop offset="1" stopColor="#ad65d4" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="dd-skin-r">
        <stop offset="0.62" stopColor="#9453c9" />
        <stop offset="1" stopColor="#9453c9" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="dd-muzzle">
        <stop offset="0.6" stopColor="#cf93ee" />
        <stop offset="1" stopColor="#cf93ee" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

const MouthPatch = () => <ellipse cx="231" cy="368" rx="46" ry="26" fill="url(#dd-muzzle)" />;

/**
 * Expression overlays in the sprite's own pixel space (640 x 651). Nothing is drawn for
 * "calm": the original face shows through.
 */
export function DuduFace({ mood }: { mood: DuduMood }) {
  if (mood === "calm") return null;
  return (
    <svg className="dudu-face absolute inset-0 h-full w-full" viewBox="0 0 640 651" preserveAspectRatio="none" aria-hidden="true" key={mood}>
      <Defs />
      {mood === "smile" && (
        <g>
          <MouthPatch />
          <path d="M198 354 Q231 398 264 354" stroke={INK} strokeWidth="8" strokeLinecap="round" fill="none" />
          <ellipse cx="84" cy="366" rx="34" ry="24" fill="#ff8fc0" opacity="0.35" />
          <ellipse cx="400" cy="388" rx="38" ry="27" fill="#ff8fc0" opacity="0.3" />
        </g>
      )}
      {mood === "bright" && (
        <g>
          <MouthPatch />
          <path d="M198 354 Q231 400 264 354" stroke={INK} strokeWidth="8" strokeLinecap="round" fill="none" />
          <ellipse cx="84" cy="366" rx="36" ry="26" fill="#ff8fc0" opacity="0.5" />
          <ellipse cx="400" cy="388" rx="40" ry="28" fill="#ff8fc0" opacity="0.45" />
          <Sparkle x={150} y={322} s={0.55} fill="#ffffff" />
          <Sparkle x={352} y={326} s={0.62} fill="#ffffff" delay={0.4} />
          <Sparkle x={86} y={226} s={0.8} delay={0.2} />
          <Sparkle x={470} y={250} s={0.7} delay={0.7} fill="#ffd8f0" />
          <Sparkle x={250} y={118} s={0.6} delay={1.1} />
        </g>
      )}
      {mood === "cheer" && (
        <g>
          <ellipse cx="138" cy="338" rx="48" ry="54" fill="url(#dd-skin-l)" />
          <ellipse cx="338" cy="342" rx="54" ry="58" fill="url(#dd-skin-r)" />
          <path d="M104 346 Q138 300 172 346" stroke="#2f0f39" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M298 352 Q338 302 378 352" stroke="#2f0f39" strokeWidth="11" strokeLinecap="round" fill="none" />
          <MouthPatch />
          <path d="M192 350 Q231 420 270 350 Z" fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
          <ellipse cx="231" cy="390" rx="17" ry="9" fill="#ff7fb5" />
          <ellipse cx="82" cy="368" rx="38" ry="27" fill="#ff8fc0" opacity="0.6" />
          <ellipse cx="402" cy="390" rx="42" ry="30" fill="#ff8fc0" opacity="0.55" />
          <Sparkle x={70} y={210} s={0.9} />
          <Sparkle x={500} y={230} s={0.8} delay={0.3} fill="#ffd8f0" />
          <Sparkle x={300} y={96} s={0.7} delay={0.6} />
          <Sparkle x={560} y={420} s={0.55} delay={0.9} />
        </g>
      )}
      {(mood === "sad" || mood === "oops") && (
        <g>
          <path d="M92 298 L172 274" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M298 276 L380 302" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="146" cy="352" r="7" fill="#fff" opacity="0.8" />
          <circle cx="346" cy="358" r="8" fill="#fff" opacity="0.8" />
          <MouthPatch />
          {mood === "sad" ? (
            <path d="M202 384 Q231 354 260 384" stroke={INK} strokeWidth="8" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M200 372 q8 -12 15 0 q8 12 15 0 q8 -12 15 0 q8 12 15 0" stroke={INK} strokeWidth="7" strokeLinecap="round" fill="none" />
          )}
          <path d="M96 240 Q80 276 96 290 Q112 276 96 240 Z" fill="#8fd8ff" opacity="0.9" />
        </g>
      )}
    </svg>
  );
}
