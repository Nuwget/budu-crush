import { asset } from "@/lib/asset";

/** A baked sprite. Decorative: the hero container carries the accessible label. */
export function Sprite({
  src,
  small,
  widths,
  className,
  style,
}: {
  src: string;
  small?: string;
  /** [small, full] intrinsic widths in px, for srcset. */
  widths?: [number, number];
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`sprite pixelated ${className ?? ""}`}
      src={asset(src)}
      srcSet={small && widths ? `${asset(small)} ${widths[0]}w, ${asset(src)} ${widths[1]}w` : undefined}
      sizes={widths ? `(max-width: 900px) ${widths[0]}px, ${widths[1]}px` : undefined}
      alt=""
      draggable={false}
      decoding="async"
      style={style}
    />
  );
}
