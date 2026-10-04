"use client";

import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import type { GameController } from "@/game/controller";
import type { LevelDef } from "@/game/engine/types";
import type { Dict } from "@/i18n/en";
import { FloatingText, type FloatingTextHandle } from "./FloatingText";
import { Tile } from "./Tile";
import { useView } from "./useView";

export interface BoardHandle {
  /** Viewport coordinates of a cell's centre. */
  cellPoint(r: number, c: number): { x: number; y: number };
  cellSize(): number;
  floatText(text: string, r: number, c: number, tier: number): void;
  shake(strength: number): void;
}

interface Drag {
  id: number;
  r: number;
  c: number;
  x: number;
  y: number;
  done: boolean;
  wasSelected: boolean;
  pointer: number;
}

/** The static checkerboard (holes are left empty). Never re-renders during play. */
const Cells = memo(function Cells({ layout }: { layout: string[] }) {
  return (
    <div className="board-cells" aria-hidden="true">
      {layout.flatMap((row, r) =>
        [...row].map((ch, c) =>
          ch === "#" ? null : <i key={`${r}-${c}`} className={`cell ${(r + c) % 2 ? "cell-b" : "cell-a"}`} style={{ "--r": r, "--c": c } as CSSProperties} />,
        ),
      )}
    </div>
  );
});

/** Frost over cells that still have ice under them. */
const Ice = memo(function Ice({ ice }: { ice: number[][] }) {
  return (
    <div className="board-ice" aria-hidden="true">
      {ice.flatMap((row, r) => row.map((n, c) => (n > 0 ? <i key={`${r}-${c}`} className={`frost frost-${n}`} style={{ "--r": r, "--c": c } as CSSProperties} /> : null)))}
    </div>
  );
});

const DIRS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

/**
 * The play field: renders the controller's tiles and turns pointer and keyboard input
 * into `ctrl.drag` / `ctrl.tap`. The surface sets touch-action: none, so dragging a
 * charm never scrolls or pulls to refresh the page.
 */
export const Board = forwardRef<BoardHandle, { ctrl: GameController; level: LevelDef; t: Dict; finger: boolean }>(function Board({ ctrl, level, t, finger }, ref) {
  const rows = level.layout.length;
  const cols = level.layout[0].length;
  const tiles = useView(ctrl, (v) => v.tiles);
  const ice = useView(ctrl, (v) => v.ice);
  const selectedId = useView(ctrl, (v) => v.selectedId);
  const hint = useView(ctrl, (v) => v.hint);
  const phase = useView(ctrl, (v) => v.phase);

  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const floaters = useRef<FloatingTextHandle>(null);
  const drag = useRef<Drag | null>(null);
  const [cursor, setCursor] = useState<[number, number]>([Math.floor(rows / 2), Math.floor(cols / 2)]);
  const [announce, setAnnounce] = useState("");

  useImperativeHandle(ref, () => ({
    cellPoint(r, c) {
      const rect = surface.current!.getBoundingClientRect();
      return { x: rect.left + ((c + 0.5) / cols) * rect.width, y: rect.top + ((r + 0.5) / rows) * rect.height };
    },
    cellSize() {
      return surface.current!.getBoundingClientRect().width / cols;
    },
    floatText(text, r, c, tier) {
      floaters.current?.add(text, ((c + 0.5) / cols) * 100, ((r + 0.5) / rows) * 100, tier);
    },
    shake(strength) {
      const el = root.current;
      if (!el) return;
      el.style.setProperty("--shake", String(strength));
      el.classList.remove("is-shaking");
      void el.offsetWidth; // restart the animation
      el.classList.add("is-shaking");
    },
  }));

  const cellAt = useCallback(
    (e: PointerEvent): [number, number] | null => {
      const rect = surface.current!.getBoundingClientRect();
      const c = Math.floor(((e.clientX - rect.left) / rect.width) * cols);
      const r = Math.floor(((e.clientY - rect.top) / rect.height) * rows);
      if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
      return level.layout[r][c] === "#" ? null : [r, c];
    },
    [cols, rows, level.layout],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (ctrl.getView().phase !== "idle") return;
    const cell = cellAt(e);
    if (!cell) return;
    const id = ctrl.idAt(cell[0], cell[1]);
    if (id === null) return;
    const sel = ctrl.getView().selectedId;
    const from = sel !== null ? ctrl.getView().tiles.find((x) => x.id === sel) : null;
    // tap-tap: a neighbour of the picked tile swaps with it
    if (from && from.id !== id && Math.abs(from.r - cell[0]) + Math.abs(from.c - cell[1]) === 1) {
      ctrl.tap(cell[0], cell[1]);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, r: cell[0], c: cell[1], x: e.clientX, y: e.clientY, done: false, wasSelected: sel === id, pointer: e.pointerId };
    if (sel !== id) ctrl.select(cell[0], cell[1]);
    setCursor(cell);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.done || d.pointer !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const cell = surface.current!.getBoundingClientRect().width / cols;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.32) return;
    d.done = true;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    ctrl.drag(d.r, d.c, horizontal ? 0 : Math.sign(dy), horizontal ? Math.sign(dx) : 0);
  };

  const finish = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null;
    if (cancelled || (!d.done && d.wasSelected)) ctrl.deselect();
  };

  const labelAt = useCallback(
    (r: number, c: number) => {
      const id = ctrl.idAt(r, c);
      const tile = id === null ? null : ctrl.getView().tiles.find((x) => x.id === id);
      if (!tile) return "";
      const name = tile.kind < 0 ? t.special.color : t.charmOne[tile.kind];
      return t.cellLabel(name, tile.kind < 0 ? "" : t.special[tile.special], r + 1, c + 1);
    },
    [ctrl, t],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = DIRS[e.key];
    const [r, c] = cursor;
    if (dir) {
      e.preventDefault();
      if (ctrl.getView().selectedId !== null) {
        ctrl.drag(r, c, dir[0], dir[1]);
        return;
      }
      const nr = Math.min(rows - 1, Math.max(0, r + dir[0]));
      const nc = Math.min(cols - 1, Math.max(0, c + dir[1]));
      setCursor([nr, nc]);
      setAnnounce(labelAt(nr, nc));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ctrl.tap(r, c);
      setAnnounce(ctrl.getView().selectedId === null ? "" : t.selected(labelAt(r, c)));
    } else if (e.key === "Escape") ctrl.deselect();
  };

  const pointOf = (r: number, c: number) => ({ left: `${((c + 0.5) / cols) * 100}%`, top: `${((r + 0.5) / rows) * 100}%` });
  const vars = useMemo(() => ({ "--cols": cols, "--rows": rows }) as CSSProperties, [cols, rows]);
  const hinted = hint ? new Set(hint.ids) : null;

  return (
    <div className="board" ref={root} style={vars} data-phase={phase}>
      <div className="board-frame">
        <Cells layout={level.layout} />
        <Ice ice={ice} />
        <div
          ref={surface}
          className="board-surface"
          role="application"
          aria-label={t.boardLabel}
          aria-describedby="board-help"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finish(e, false)}
          onPointerCancel={(e) => finish(e, true)}
          onLostPointerCapture={(e) => finish(e, true)}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
        >
          {tiles.map((tile) => (
            <Tile key={tile.id} kind={tile.kind} special={tile.special} r={tile.r} c={tile.c} fx={tile.fx} d={tile.d} selected={tile.id === selectedId} hinted={!!hinted?.has(tile.id)} />
          ))}
          <i className="board-cursor" style={{ "--r": cursor[0], "--c": cursor[1] } as CSSProperties} aria-hidden="true" />
          <FloatingText ref={floaters} />
          {finger && hint && phase === "idle" && (
            <span className="finger" aria-hidden="true" style={{ "--ax": pointOf(hint.a[0], hint.a[1]).left, "--ay": pointOf(hint.a[0], hint.a[1]).top, "--bx": pointOf(hint.b[0], hint.b[1]).left, "--by": pointOf(hint.b[0], hint.b[1]).top } as CSSProperties}>
              <svg viewBox="0 0 24 24" shapeRendering="crispEdges">
                <path d="M9 2h3v8h1V8h3v2h1V9h3v2h1v8h-2v3H8v-3H6v-3H4v-3h3V8h2z" fill="#fff" stroke="#3b1450" strokeWidth="1" />
              </svg>
            </span>
          )}
        </div>
      </div>
      <p id="board-help" className="sr-only">
        {t.boardHelp}
      </p>
      <div className="sr-only" aria-live="polite" role="status">
        {announce}
      </div>
    </div>
  );
});

