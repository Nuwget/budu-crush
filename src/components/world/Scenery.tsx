import { mulberry32 } from "@/lib/prng";

type Tower = { x: number; w: number; h: number };

const W = 320;
const H = 64;

function build(seed: number, minH: number, maxH: number, density: number) {
  const rnd = mulberry32(seed);
  const towers: Tower[] = [];
  const windows: { x: number; y: number; g: number; warm: boolean }[] = [];
  const antennas: { x: number; y: number }[] = [];
  let x = -4;
  while (x < W) {
    const w = 9 + Math.floor(rnd() * 14);
    const h = minH + Math.floor(rnd() * (maxH - minH));
    towers.push({ x, w, h });
    if (h > maxH - 6 && rnd() > 0.5) antennas.push({ x: x + Math.floor(w / 2), y: H - h - 3 });
    for (let wy = H - h + 3; wy < H - 2; wy += 3) {
      for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        if (rnd() < density) windows.push({ x: wx, y: wy, g: Math.floor(rnd() * 4), warm: rnd() > 0.35 });
      }
    }
    x += w + (rnd() > 0.75 ? 2 : 0);
  }
  return { towers, windows, antennas };
}

const FAR = build(7, 14, 34, 0.28);
const NEAR = build(21, 22, 52, 0.4);

// A pixel-art moon: a disc lit from the upper left, with craters and a shaded rim.
const MOON = (() => {
  const N = 26;
  const c = (N - 1) / 2;
  const rnd = mulberry32(11);
  const craters = Array.from({ length: 7 }, () => ({
    x: c + (rnd() - 0.5) * 14,
    y: c + (rnd() - 0.5) * 14,
    r: 1.2 + rnd() * 2.2,
  }));
  const cells: { x: number; y: number; fill: string }[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > 12.4) continue;
      // light from the upper left
      const lit = ((c - x) * 0.6 + (c - y) * 0.8) / 12.4; // -1..1
      let fill = lit > 0.55 ? "#fffaff" : lit > 0.15 ? "#ece4ff" : lit > -0.25 ? "#d3c6fb" : lit > -0.6 ? "#b4a3ee" : "#9382d6";
      if (d > 11.2) fill = lit > 0 ? "#cdbfff" : "#7f6fc4"; // rim
      for (const k of craters) {
        const kd = Math.hypot(x - k.x, y - k.y);
        if (kd < k.r && d < 11) fill = kd < k.r * 0.55 ? "#b3a3ec" : "#c3b5f6";
      }
      cells.push({ x, y, fill });
    }
  }
  return { N, cells };
})();

function Skyline({ data, fill, light, className, blink }: { data: typeof FAR; fill: string; light: [string, string]; className: string; blink?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
    >
      {data.towers.map((t, i) => (
        <rect key={i} x={t.x} y={H - t.h} width={t.w} height={t.h} fill={fill} />
      ))}
      {[0, 1, 2, 3].map((g) => (
        <g key={g} className={`world-win world-win-${g}`}>
          {data.windows
            .filter((w) => w.g === g)
            .map((w, i) => (
              <rect key={i} x={w.x} y={w.y} width={1.6} height={1.6} fill={w.warm ? light[0] : light[1]} />
            ))}
        </g>
      ))}
      {blink &&
        data.antennas.map((a, i) => (
          <g key={i}>
            <rect x={a.x} y={a.y} width={1} height={3} fill={fill} />
            <rect x={a.x - 0.5} y={a.y - 1.5} width={2} height={2} fill="#ff5a73" className="world-beacon" style={{ animationDelay: `${i * 0.7}s` }} />
          </g>
        ))}
    </svg>
  );
}

function PixelCloud({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 8" shapeRendering="crispEdges">
      <g fill="#9d8ae6">
        <rect x="3" y="4" width="18" height="3" />
        <rect x="5" y="2" width="6" height="2" />
        <rect x="11" y="1" width="6" height="3" />
        <rect x="17" y="3" width="4" height="1" />
      </g>
      <g fill="#c9bcff">
        <rect x="5" y="2" width="6" height="1" />
        <rect x="11" y="1" width="6" height="1" />
      </g>
    </svg>
  );
}

/** Pixel moon with drifting clouds, and a two-layer skyline with twinkling windows and beacons. */
export function Scenery() {
  return (
    <div aria-hidden="true" className="world-scenery">
      <div className="world-parallax world-parallax-moon">
        <div className="world-moon-halo" />
        <svg className="world-moon" viewBox={`0 0 ${MOON.N} ${MOON.N}`} shapeRendering="crispEdges">
          {MOON.cells.map((c, i) => (
            <rect key={i} x={c.x} y={c.y} width="1.02" height="1.02" fill={c.fill} />
          ))}
        </svg>
        <PixelCloud className="world-cloud world-cloud-1" />
        <PixelCloud className="world-cloud world-cloud-2" />
      </div>
      <div className="world-parallax world-parallax-far">
        <Skyline data={FAR} fill="#1c1450" light={["#b9a7ff", "#8f7fe0"]} className="world-skyline world-skyline-far" />
      </div>
      <div className="world-parallax world-parallax-near">
        <Skyline data={NEAR} fill="#0d0a2c" light={["#ffc98a", "#a98bff"]} className="world-skyline world-skyline-near" blink />
      </div>
    </div>
  );
}
