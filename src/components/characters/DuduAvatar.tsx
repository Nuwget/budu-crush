import { asset } from "@/lib/asset";
import { SCENE } from "@/lib/scene";

/** A round face crop of the original illustration. Cheap: no extra sprite files. */
export function DuduAvatar({
  size = 36,
  focus = [0.395, 0.46],
  zoom = 2.5,
}: {
  size?: number;
  /** Center of the crop, as a fraction of the illustration. */
  focus?: [number, number];
  /** Background width as a multiple of `size`. */
  zoom?: number;
}) {
  const bgW = size * zoom;
  const bgH = (bgW * SCENE.height) / SCENE.width;
  return (
    <span
      aria-hidden="true"
      className="pixelated inline-block shrink-0 rounded-full ring-1 ring-lavender/40"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${asset(SCENE.src.small)})`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${size / 2 - focus[0] * bgW}px ${size / 2 - focus[1] * bgH}px`,
      }}
    />
  );
}

/** Bubu's face crop, framed the same way. */
export const BubuAvatar = ({ size = 54 }: { size?: number }) => <DuduAvatar size={size} focus={[0.865, 0.5]} zoom={7.5} />;
