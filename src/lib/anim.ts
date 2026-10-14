// Web Animations bookkeeping without `getAnimations()`: that call flushes style, and a cascade used to make
// dozens of them per wave. Each element remembers the animations this module started on it.
const live = new WeakMap<Element, Animation[]>();

/** Cancel what was started on this element through `run`/`add`. */
export function stop(el: Element) {
  const list = live.get(el);
  if (!list) return;
  for (const a of list) a.cancel();
  live.delete(el);
}

/** Start an animation, replacing whatever was running on the element. */
export function run(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation {
  stop(el);
  const a = el.animate(frames, opts);
  live.set(el, [a]);
  return a;
}

/** Start an animation next to the ones already running (letters of a word, for instance). */
export function add(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation {
  const a = el.animate(frames, opts);
  const list = live.get(el);
  if (list) list.push(a);
  else live.set(el, [a]);
  return a;
}

/** Is something this module started still playing on the element? */
export function busy(el: Element): boolean {
  const list = live.get(el);
  return !!list && list.some((a) => a.playState === "running");
}
