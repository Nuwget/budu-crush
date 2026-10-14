import type { GameState, LevelDef, Pos, Special, Status, Step } from "./engine/types.ts";
import { createState } from "./engine/init.ts";
import { resolveSwap } from "./engine/resolve.ts";
import { findMove } from "./engine/moves.ts";
import { adjacent } from "./board/board.ts";
import { comboTier } from "./scoring/tiers.ts";
import { starsFor } from "./scoring/score.ts";
import { Juice, type Callout, type Intensity } from "./juice.ts";
import { mulberry32 } from "../lib/prng.ts";

export type Phase = "idle" | "busy" | "won" | "lost";
export type Mood = "calm" | "smile" | "bright" | "cheer" | "sad" | "oops";
export type TileFx = "" | "clear" | "spawn" | "drop" | "convert" | "land";

export interface RenderTile {
  id: number;
  kind: number;
  special: Special;
  r: number;
  c: number;
  fx: TileFx;
  /** How far the tile last fell, in rows; longer falls take a little longer. */
  d: number;
}

export interface Hint {
  a: Pos;
  b: Pos;
  ids: [number, number];
}

export interface View {
  tiles: RenderTile[];
  ice: number[][];
  score: number;
  moves: number;
  collected: number;
  iceLeft: number;
  phase: Phase;
  mood: Mood;
  selectedId: number | null;
  hint: Hint | null;
  /** Cascade step of the move being played; 0 when none. Drives the multiplier chip. */
  combo: number;
  /** The level has been played at least once (the tutorial goes away). */
  moved: boolean;
  notice: "shuffle" | null;
}

/** What just happened, for Dudu and Bubu to react to. `x` is the horizontal position on the board, 0..1. */
export interface Reaction {
  kind: "match" | "oops" | "win" | "lose" | "low" | "select";
  level: Intensity;
  combo: number;
  x: number;
}

export interface Impact {
  level: Intensity;
  combo: number;
  callout: Callout | null;
  /** Rows the cleared tiles span, and their mean column. */
  top: number;
  bottom: number;
  col: number;
  /** Mean cell of the cleared tiles, where the points are born. */
  row: number;
  /** Horizontal position of the match on the board, 0..1. */
  x: number;
  delta: number;
}

/** Everything the controller wants the UI to do besides changing the view. */
export interface Fx {
  burst(r: number, c: number, kind: number, count: number): void;
  special(special: Special, r: number, c: number, cells: Pos[]): void;
  /** A word of praise for a match spanning rows top..bottom around column c. */
  callout(co: Callout, top: number, bottom: number, c: number): void;
  /** The one moment a clear wave lands: word, sparks, score number, rim and characters, timed together. */
  impact(ev: Impact): void;
  /** The nth star (0-2) was just earned. */
  star(index: number): void;
  /** The whole screen takes a breath: board glow and world light. */
  glow(level: number): void;
  react(ev: Reaction): void;
  shake(strength: number): void;
  sfx(name: string, n?: number): void;
  haptic(name: string): void;
}

export interface Options {
  /** Shorter waits when the player asked for less motion. */
  reduceMotion?: boolean;
  /** Show the swap hint right away (the tutorial) instead of after a pause. */
  tutorial?: boolean;
  onEnd?: (status: Exclude<Status, "playing">, score: number, movesLeft: number) => void;
  onFirstMove?: () => void;
}

const HINT_DELAY = 7000;

/**
 * Drives one level. The engine resolves a move instantly into steps; the controller plays
 * those steps back as animation: it keeps the render model (tiles with ids and positions),
 * waits between steps, fires effects, and locks input while it runs. Plain TypeScript, no
 * React: the UI subscribes to `view`.
 */
export class GameController {
  state: GameState;
  view: View;
  private tiles = new Map<number, RenderTile>();
  private grid: (number | null)[][];
  private listeners = new Set<() => void>();
  private disposed = false;
  private timers = new Set<number>();
  private juice: Juice;
  private scoreAhead = 0;
  private pendingSpecial: "lineH" | "lineV" | "bomb" | "color" | undefined;
  /** Clear waves in the move being played, known up front because the engine resolves it whole. */
  private chain = 1;
  /** Waits shrink as a cascade builds: each wave comes a little faster than the last. */
  private pace = 1;
  private comboTimer = 0;
  private moodTimer = 0;
  private hintTimer = 0;
  private reduce: boolean;
  private nearFired = false;
  readonly level: LevelDef;
  private fx: Fx;
  private opts: Options;

  /** QA harness only: swap in a prepared engine state (a long cascade) and show it. */
  qaLoad(state: GameState): void {
    this.state = state;
    this.reconcile();
    this.commit({ moves: state.moves, score: state.score, collected: state.collected, iceLeft: state.iceLeft });
  }

  /** The effect sink, for the QA harness. */
  fxForQa(): Fx {
    return this.fx;
  }

  constructor(level: LevelDef, fx: Fx, opts: Options = {}) {
    this.level = level;
    this.fx = fx;
    this.opts = opts;
    this.reduce = !!opts.reduceMotion;
    this.state = createState(level);
    this.juice = new Juice(mulberry32(level.seed ^ 0x5bd1e995));
    this.grid = this.state.board.map((row) => row.map(() => null));
    this.state.board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.tile) return;
        this.tiles.set(cell.tile.id, { id: cell.tile.id, kind: cell.tile.kind, special: cell.tile.special, r, c, fx: "", d: 0 });
        this.grid[r][c] = cell.tile.id;
      }),
    );
    this.view = {
      tiles: [...this.tiles.values()],
      ice: this.state.board.map((row) => row.map((c) => c.ice)),
      score: 0,
      moves: this.state.moves,
      collected: 0,
      iceLeft: this.state.iceLeft,
      phase: "idle",
      mood: "calm",
      selectedId: null,
      hint: null,
      combo: 0,
      moved: false,
      notice: null,
    };
  }

  /** Begin timers (hints). Safe to call again after `dispose` (React strict mode remounts). */
  start() {
    this.disposed = false;
    this.scheduleHint();
  }

  // ---- subscription (useSyncExternalStore) ----
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getView = () => this.view;

  setReduceMotion(v: boolean) {
    this.reduce = v;
  }

  dispose() {
    this.disposed = true;
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
    window.clearTimeout(this.moodTimer);
    window.clearTimeout(this.hintTimer);
    window.clearTimeout(this.comboTimer);
  }

  private commit(patch: Partial<View>) {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((l) => l());
  }
  private flush() {
    this.commit({ tiles: [...this.tiles.values()].map((t) => ({ ...t })) });
  }

  private wait(ms: number) {
    const scaled = this.reduce ? Math.min(ms, 60) : Math.round(ms * this.pace);
    return new Promise<void>((resolve) => {
      if (this.disposed) return resolve();
      const id = window.setTimeout(() => {
        this.timers.delete(id);
        resolve();
      }, scaled);
      this.timers.add(id);
    });
  }
  /** Two animation frames, so the browser paints a tile's start position before it moves. */
  private frames() {
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      requestAnimationFrame(() => requestAnimationFrame(done));
      window.setTimeout(done, 80); // background tabs do not run rAF
    });
  }

  private setMood(mood: Mood, holdMs = 1400) {
    window.clearTimeout(this.moodTimer);
    this.commit({ mood });
    if (holdMs > 0) this.moodTimer = window.setTimeout(() => this.commit({ mood: "calm" }), holdMs);
  }

  // ---- hints ----
  private scheduleHint() {
    window.clearTimeout(this.hintTimer);
    if (this.view?.phase && this.view.phase !== "idle") return;
    const delay = this.opts.tutorial && !this.view?.moved ? 600 : HINT_DELAY;
    this.hintTimer = window.setTimeout(() => {
      if (this.disposed || this.view.phase !== "idle") return;
      const move = findMove(this.state.board);
      if (!move) return;
      const [a, b] = move;
      const ids: [number, number] = [this.grid[a[0]][a[1]]!, this.grid[b[0]][b[1]]!];
      this.commit({ hint: { a, b, ids } });
    }, delay);
  }
  private clearHint() {
    window.clearTimeout(this.hintTimer);
    if (this.view.hint) this.commit({ hint: null });
  }

  // ---- input ----
  idAt(r: number, c: number): number | null {
    return this.grid[r]?.[c] ?? null;
  }
  private posOf(id: number): Pos | null {
    const t = this.tiles.get(id);
    return t ? [t.r, t.c] : null;
  }

  /** Tap: pick a tile, or swap with the picked tile if this one is its neighbour. */
  tap(r: number, c: number) {
    if (this.view.phase !== "idle") return;
    const id = this.idAt(r, c);
    if (id === null) return;
    const sel = this.view.selectedId;
    if (sel !== null && sel !== id) {
      const from = this.posOf(sel);
      if (from && adjacent(from, [r, c])) {
        void this.play(from, [r, c]);
        return;
      }
    }
    this.fx.sfx("click");
    this.fx.haptic("select");
    this.fx.react({ kind: "select", level: 0, combo: 0, x: (c + 0.5) / this.state.cols });
    this.clearHint();
    this.commit({ selectedId: sel === id ? null : id });
    this.scheduleHint();
  }

  select(r: number, c: number) {
    if (this.view.phase !== "idle") return;
    const id = this.idAt(r, c);
    this.commit({ selectedId: id });
    if (id !== null) {
      this.fx.sfx("click");
      this.fx.haptic("select");
      this.fx.react({ kind: "select", level: 0, combo: 0, x: (c + 0.5) / this.state.cols });
    }
  }

  deselect() {
    if (this.view.selectedId !== null) this.commit({ selectedId: null });
  }

  /** Drag: swap the tile at (r, c) with its neighbour in direction (dr, dc). */
  drag(r: number, c: number, dr: number, dc: number) {
    const b: Pos = [r + dr, c + dc];
    if (b[0] < 0 || b[1] < 0 || b[0] >= this.state.rows || b[1] >= this.state.cols) return;
    void this.play([r, c], b);
  }

  async play(a: Pos, b: Pos): Promise<void> {
    if (this.view.phase !== "idle" || this.disposed) return;
    this.clearHint();
    const res = resolveSwap(this.state, a, b);
    if (res.steps.length === 0) return;
    this.commit({ selectedId: null, phase: "busy", notice: null });
    this.pendingSpecial = undefined;
    this.chain = res.steps.filter((x) => x.t === "clear").length;
    this.pace = 1;
    window.clearTimeout(this.comboTimer);
    if (!this.view.moved) {
      this.commit({ moved: true });
      this.opts.onFirstMove?.();
    }
    try {
      for (let i = 0; i < res.steps.length; i++) {
        if (this.disposed) return;
        const step = res.steps[i];
        if (step.t === "clear") {
          // the points this wave is worth are known up front: they are born at the impact
          const next = res.steps.slice(i + 1).find((x) => x.t === "score");
          this.scoreAhead = next && next.t === "score" ? next.delta : 0;
        }
        await this.apply(step);
      }
    } finally {
      if (!this.disposed) {
        this.state = res.state;
        this.reconcile();
      }
    }
    if (this.disposed) return;
    const status = res.state.status;
    if (this.view.combo) this.comboTimer = window.setTimeout(() => this.commit({ combo: 0 }), 900);
    if (status === "playing") {
      this.commit({ phase: "idle", notice: null });
      this.setMood("calm", 0);
      if (res.state.moves <= 3) this.fx.react({ kind: "low", level: 0, combo: 0, x: 0.5 });
      this.scheduleHint();
      return;
    }
    this.pace = 1;
    if (status === "won") {
      // a staged ending: the last points arrive and the objective fills, a breath, then the pair and the word
      this.setMood("cheer", 0);
      await this.wait(550);
      if (this.disposed) return;
      const three = this.level.objective.type !== "score" || starsFor(res.state.score, this.level.stars) === 3;
      this.fx.sfx("victory");
      this.fx.haptic("victory");
      this.fx.react({ kind: "win", level: 4, combo: 0, x: 0.5 });
      this.fx.callout(this.juice.win(three), this.state.rows / 2 - 0.5, this.state.rows / 2 - 0.5, this.state.cols / 2 - 0.5);
      this.fx.glow(4);
      await this.wait(1500);
    } else {
      this.fx.react({ kind: "lose", level: 0, combo: 0, x: 0.5 });
      this.setMood("sad", 0);
      this.fx.sfx("defeat");
      this.fx.haptic("defeat");
      await this.wait(900);
    }
    if (this.disposed) return;
    this.commit({ phase: status });
    this.opts.onEnd?.(status, res.state.score, res.state.moves);
  }

  /** Make the render model equal the engine state, whatever happened during playback. */
  private reconcile() {
    const seen = new Set<number>();
    this.grid = this.state.board.map((row) => row.map(() => null));
    this.state.board.forEach((row, r) =>
      row.forEach((cell, c) => {
        const t = cell.tile;
        if (!t) return;
        seen.add(t.id);
        this.grid[r][c] = t.id;
        const existing = this.tiles.get(t.id);
        if (existing) Object.assign(existing, { kind: t.kind, special: t.special, r, c, fx: "" });
        else this.tiles.set(t.id, { id: t.id, kind: t.kind, special: t.special, r, c, fx: "", d: 0 });
      }),
    );
    for (const id of [...this.tiles.keys()]) if (!seen.has(id)) this.tiles.delete(id);
    this.flush();
    this.commit({
      ice: this.state.board.map((row) => row.map((c) => c.ice)),
      score: this.state.score,
      moves: this.state.moves,
      collected: this.state.collected,
      iceLeft: this.state.iceLeft,
    });
  }

  private place(id: number, r: number, c: number, fx: TileFx = "", d = 0) {
    const t = this.tiles.get(id);
    if (!t) return;
    t.r = r;
    t.c = c;
    t.fx = fx;
    t.d = d;
    this.grid[r][c] = id;
  }

  private async apply(step: Step): Promise<void> {
    switch (step.t) {
      case "swap": {
        const ia = this.grid[step.a[0]][step.a[1]]!;
        const ib = this.grid[step.b[0]][step.b[1]]!;
        this.place(ia, step.b[0], step.b[1]);
        this.place(ib, step.a[0], step.a[1]);
        this.flush();
        this.commit({ moves: step.moves });
        this.fx.sfx("swap");
        this.fx.haptic("swap");
        await this.wait(190);
        return;
      }
      case "invalid": {
        const ia = this.grid[step.a[0]][step.a[1]]!;
        const ib = this.grid[step.b[0]][step.b[1]]!;
        this.place(ia, step.b[0], step.b[1]);
        this.place(ib, step.a[0], step.a[1]);
        this.flush();
        this.fx.sfx("swap");
        await this.wait(170);
        this.place(ia, step.a[0], step.a[1]);
        this.place(ib, step.b[0], step.b[1]);
        this.flush();
        this.fx.sfx("invalid");
        this.fx.react({ kind: "oops", level: 0, combo: 0, x: (step.a[1] + 0.5) / this.state.cols });
        this.setMood("oops", 1100);
        await this.wait(190);
        return;
      }
      case "activate": {
        this.fx.special(step.special, step.r, step.c, step.cells);
        if (step.special === "lineH" || step.special === "lineV") this.fx.sfx("line");
        else if (step.special === "bomb") {
          this.fx.sfx("bomb");
          this.fx.shake(0.5);
        } else if (step.special === "color") {
          this.fx.sfx("color");
          this.fx.shake(0.7);
        }
        this.fx.haptic("special");
        if (step.special !== "none") this.pendingSpecial = step.special;
        this.setMood("bright", 1500);
        await this.wait(200);
        return;
      }
      case "convert": {
        for (const t of step.tiles) {
          const rt = this.tiles.get(t.id);
          if (rt) {
            rt.special = t.special;
            rt.fx = "convert";
          }
        }
        this.flush();
        this.fx.sfx("special");
        await this.wait(420);
        for (const t of step.tiles) {
          const rt = this.tiles.get(t.id);
          if (rt) rt.fx = "";
        }
        return;
      }
      case "clear": {
        const wave = { size: step.tiles.length, combo: step.combo, chain: this.chain, special: this.pendingSpecial };
        this.pendingSpecial = undefined;
        const level = Juice.intensity(wave);
        this.pace = Math.max(0.65, 1 - (step.combo - 1) * 0.1);
        let cr = 0;
        let cc = 0;
        let top = 99;
        let bottom = 0;
        for (const t of step.tiles) {
          const rt = this.tiles.get(t.id);
          if (rt) rt.fx = "clear";
          this.fx.burst(t.r, t.c, t.kind, 3 + level);
          cr += t.r / step.tiles.length;
          cc += t.c / step.tiles.length;
          top = Math.min(top, t.r);
          bottom = Math.max(bottom, t.r);
        }
        this.flush();
        this.fx.sfx("match", step.combo);
        this.fx.haptic(level >= 3 ? "big" : level >= 1 ? "combo" : "match");
        // t=0: the tiles squat and swell (CSS). The impact lands ~90ms later and everything else follows from it.
        await this.wait(90);
        if (this.disposed) return;
        this.commit({ combo: step.combo });
        const co = this.juice.wave(wave);
        this.fx.impact({ level, combo: step.combo, callout: co, top, bottom, col: cc, row: cr, x: (cc + 0.5) / this.state.cols, delta: this.scoreAhead });
        if (co) this.fx.sfx("callout", level);
        if (level >= 1) this.fx.sfx("combo", comboTier(step.combo));
        if (level >= 1) this.setMood(level >= 3 ? "cheer" : "bright", 1600);
        else if (this.view.mood === "calm") this.setMood("smile", 900);
        if (level >= 4) this.fx.shake(0.6);
        // a short hit-stop on the big ones (the board holds while the effects play), never a freeze
        const hold = level >= 4 ? 200 : level === 3 ? 90 : 0;
        await this.wait(140 + hold);
        for (const t of step.tiles) {
          this.tiles.delete(t.id);
          if (this.grid[t.r][t.c] === t.id) this.grid[t.r][t.c] = null;
        }
        this.flush();
        return;
      }
      case "damage": {
        const ice = this.view.ice.map((row) => row.slice());
        ice[step.r][step.c] = step.ice;
        this.commit({ ice });
        this.fx.sfx("ice");
        return;
      }
      case "score": {
        const before = this.view.score;
        const beforeCollected = this.view.collected;
        const beforeIce = this.view.iceLeft;
        this.commit({ score: step.score, collected: step.collected, iceLeft: step.iceLeft });
        // goal progress, and one "almost there" the first time the goal passes 80%
        const o = this.level.objective;
        if ((o.type === "collect" && step.collected > beforeCollected) || (o.type === "ice" && step.iceLeft < beforeIce)) this.fx.sfx("obj");
        const frac = o.type === "score" ? step.score / o.target : o.type === "collect" ? step.collected / o.count : 0;
        if (!this.nearFired && frac >= 0.8 && frac < 1) {
          this.nearFired = true;
          this.fx.sfx("near");
        }
        if (this.level.objective.type === "score" && starsFor(step.score, this.level.stars) > starsFor(before, this.level.stars)) {
          this.fx.callout(this.juice.star(), step.at[0], step.at[0], step.at[1]);
          this.fx.sfx("star", starsFor(step.score, this.level.stars) - 1);
          this.fx.star(starsFor(step.score, this.level.stars) - 1);
          this.fx.glow(3);
          this.fx.react({ kind: "match", level: 3, combo: step.combo, x: 0.5 });
        }
        return;
      }
      case "spawn": {
        const n = step.tile;
        this.tiles.set(n.id, { id: n.id, kind: n.kind, special: n.special, r: n.r, c: n.c, fx: "spawn", d: 0 });
        this.grid[n.r][n.c] = n.id;
        this.flush();
        this.fx.sfx("special");
        this.fx.haptic("special");
        this.fx.burst(n.r, n.c, n.kind, 14);
        await this.wait(260);
        const t = this.tiles.get(n.id);
        if (t) t.fx = "";
        return;
      }
      case "fall": {
        // clear old grid slots of moving tiles first, then write the new ones
        for (const m of step.moves) {
          const t = this.tiles.get(m.id);
          if (t && this.grid[t.r][t.c] === m.id) this.grid[t.r][t.c] = null;
        }
        let far = 1;
        for (const m of step.moves) {
          const t = this.tiles.get(m.id);
          const dist = t ? Math.abs(m.r - t.r) : 1;
          far = Math.max(far, dist);
          this.place(m.id, m.r, m.c, "land", dist);
        }
        this.flush();
        await this.wait(120 + far * 38);
        return;
      }
      case "refill": {
        let far = 1;
        for (const n of step.tiles) {
          this.tiles.set(n.id, { id: n.id, kind: n.kind, special: n.special, r: n.fromR, c: n.c, fx: "drop", d: 0 });
          far = Math.max(far, n.r - n.fromR);
        }
        this.flush();
        await this.frames();
        for (const n of step.tiles) this.place(n.id, n.r, n.c, "land", n.r - n.fromR);
        this.flush();
        await this.wait(190 + far * 42);
        return;
      }
      case "shuffle": {
        this.commit({ notice: "shuffle" });
        this.fx.sfx("shuffle");
        this.grid = this.grid.map((row) => row.map(() => null));
        const keep = new Set(step.tiles.map((t) => t.id));
        for (const id of [...this.tiles.keys()]) if (!keep.has(id)) this.tiles.delete(id);
        for (const n of step.tiles) {
          if (!this.tiles.has(n.id)) this.tiles.set(n.id, { id: n.id, kind: n.kind, special: n.special, r: n.r, c: n.c, fx: "spawn", d: 0 });
          else this.place(n.id, n.r, n.c, "", 3);
          this.grid[n.r][n.c] = n.id;
        }
        this.flush();
        await this.wait(750);
        this.commit({ notice: null });
        return;
      }
      case "end":
        return;
    }
  }
}
