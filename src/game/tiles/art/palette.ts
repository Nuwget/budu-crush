/** Grid keys: . empty, o outline, s shade, b base, h highlight, w glint, a accent. */
export type Palette = Record<string, string>;

export const PALETTES: Record<string, Palette> = {
  moon: { o: "#6a4c1c", s: "#e2b869", b: "#ffe3a0", h: "#fff4cf", w: "#ffffff", a: "#e2b869" },
  star: { o: "#8a3f08", s: "#f08a1c", b: "#ffc83d", h: "#ffe98a", w: "#ffffff", a: "#ffe98a" },
  cloud: { o: "#3a4f9e", s: "#8eb0ee", b: "#d2e6ff", h: "#f6fbff", w: "#ffffff", a: "#8eb0ee" },
  heart: { o: "#7a1747", s: "#d63a84", b: "#ff6fb1", h: "#ffb4d8", w: "#ffffff", a: "#ffb4d8" },
  crystal: { o: "#07505a", s: "#1b9d94", b: "#4fe0d0", h: "#b9fff4", w: "#ffffff", a: "#b9fff4" },
  flower: { o: "#3f2388", s: "#7a54dc", b: "#b68fff", h: "#e3d3ff", w: "#ffffff", a: "#ffd45e" },
  orb: {
    o: "#2a1466",
    s: "#6b4bd6",
    b: "#a98bff",
    h: "#e2d8ff",
    w: "#ffffff",
    a: "#ffffff",
    r: "#ff6f9c",
    y: "#ffd45e",
    g: "#6ff0a8",
    c: "#5fd6ff",
    p: "#b68fff",
  },
  // overlays
  lineH: { w: "#ffffff", a: "#ffe98a", o: "#7a3dd0" },
  lineV: { w: "#ffffff", a: "#ffe98a", o: "#7a3dd0" },
  bomb: { a: "#ffe98a", w: "#ffffff", o: "#ff7ab8" },
};
