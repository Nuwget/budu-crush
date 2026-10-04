import type { Board, Kind, Pos, Special } from "./types.ts";

export interface Run {
  kind: Kind;
  axis: "h" | "v";
  cells: Pos[];
}

export interface Group {
  kind: Kind;
  cells: Pos[];
  runs: Run[];
  /** The special this group earns (when specials are enabled). */
  creates: Special;
}

function kindAt(board: Board, r: number, c: number): Kind | null {
  const t = board[r][c].tile;
  // The colour orb has kind -1 and never joins a run.
  return t && t.kind >= 0 ? t.kind : null;
}

export function findRuns(board: Board): Run[] {
  const rows = board.length;
  const cols = board[0].length;
  const runs: Run[] = [];
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const k = kindAt(board, r, c);
      let e = c + 1;
      if (k !== null) while (e < cols && kindAt(board, r, e) === k) e++;
      if (k !== null && e - c >= 3) runs.push({ kind: k, axis: "h", cells: Array.from({ length: e - c }, (_, i): Pos => [r, c + i]) });
      c = Math.max(e, c + 1);
    }
  }
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const k = kindAt(board, r, c);
      let e = r + 1;
      if (k !== null) while (e < rows && kindAt(board, e, c) === k) e++;
      if (k !== null && e - r >= 3) runs.push({ kind: k, axis: "v", cells: Array.from({ length: e - r }, (_, i): Pos => [r + i, c]) });
      r = Math.max(e, r + 1);
    }
  }
  return runs;
}

/** Merge runs that share a cell (L, T and plus shapes) and classify what each group creates. */
export function findGroups(board: Board): Group[] {
  const runs = findRuns(board);
  if (runs.length === 0) return [];
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<number, number>();
  const cols = board[0].length;
  runs.forEach((run, i) => {
    for (const [r, c] of run.cells) {
      const key = r * cols + c;
      const o = owner.get(key);
      if (o === undefined) owner.set(key, i);
      else parent[find(i)] = find(o);
    }
  });
  const byRoot = new Map<number, Run[]>();
  runs.forEach((run, i) => {
    const root = find(i);
    const list = byRoot.get(root);
    if (list) list.push(run);
    else byRoot.set(root, [run]);
  });
  const groups: Group[] = [];
  for (const list of byRoot.values()) {
    const seen = new Set<number>();
    const cells: Pos[] = [];
    for (const run of list)
      for (const p of run.cells) {
        const key = p[0] * cols + p[1];
        if (!seen.has(key)) {
          seen.add(key);
          cells.push(p);
        }
      }
    groups.push({ kind: list[0].kind, cells, runs: list, creates: classify(list) });
  }
  return groups;
}

/** color > bomb > line > nothing. A horizontal 4 makes a vertical clearer and vice versa. */
function classify(runs: Run[]): Special {
  const longest = runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
  if (longest.cells.length >= 5) return "color";
  const hasH = runs.some((r) => r.axis === "h");
  const hasV = runs.some((r) => r.axis === "v");
  if (hasH && hasV) return "bomb";
  if (longest.cells.length === 4) return longest.axis === "h" ? "lineV" : "lineH";
  return "none";
}

/** Cheap local test: would a run of 3+ pass through (r, c)? Used for move detection. */
export function hasMatchAt(board: Board, r: number, c: number): boolean {
  const k = kindAt(board, r, c);
  if (k === null) return false;
  const rows = board.length;
  const cols = board[0].length;
  let n = 1;
  for (let i = c - 1; i >= 0 && kindAt(board, r, i) === k; i--) n++;
  for (let i = c + 1; i < cols && kindAt(board, r, i) === k; i++) n++;
  if (n >= 3) return true;
  n = 1;
  for (let i = r - 1; i >= 0 && kindAt(board, i, c) === k; i--) n++;
  for (let i = r + 1; i < rows && kindAt(board, i, c) === k; i++) n++;
  return n >= 3;
}
