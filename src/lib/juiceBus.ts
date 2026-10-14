// A one-way line from the game to the night world behind it: "the screen just took a
// breath". The world listens and plays one cheap opacity/scale pulse; nobody else needs to know.
type Listener = (level: number) => void;
const listeners = new Set<Listener>();

export function onWorldPulse(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function pulseWorld(level: number) {
  listeners.forEach((fn) => fn(level));
}
