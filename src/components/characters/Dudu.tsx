import { SCENE, place } from "@/lib/scene";
import { DuduFace, type DuduMood } from "./DuduFace";
import { Sprite } from "./Sprite";

const { sprites, src } = SCENE;

/**
 * Dudu, the purple bear. The wrapper fills its parent's width (the aspect ratio is the
 * sprite's); the inner element breathes and sways, the eyelids blink, and `mood` swaps the
 * expression overlay: the same sprite, a different feeling.
 */
export function Dudu({ mood = "calm", className = "" }: { mood?: DuduMood; className?: string }) {
  const blinks = mood === "calm" || mood === "smile";
  return (
    <div className={`dudu dudu-${mood} ${className}`} aria-hidden="true">
      <div className="dudu-body anim-idle absolute inset-0">
        <Sprite src={src.dudu} small={src.duduSmall} widths={[400, 640]} className="absolute inset-0 h-full w-full" />
        {blinks && (
          <>
            <Sprite src={src.eyeLeft} className="anim-blink" style={place(sprites.eyeLeft, sprites.dudu)} />
            <Sprite src={src.eyeRight} className="anim-blink" style={place(sprites.eyeRight, sprites.dudu)} />
          </>
        )}
        <DuduFace mood={mood} />
      </div>
    </div>
  );
}
