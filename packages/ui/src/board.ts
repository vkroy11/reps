/**
 * Geometry for the path board.
 *
 * Every measurement the serpentine map needs, in one place, so changing
 * `nodeGap` rescales the whole thing rather than breaking the trail's
 * relationship to the discs.
 */
export const board = {
  width: 350,
  firstNodeY: 70,
  /** Vertical distance between consecutive discs. */
  nodeGap: 122,
  /** Extra height a gate row consumes on top of nodeGap. */
  gateGap: 104,
  nodeSize: 68,
  /** x as a fraction of width, cycling by node index. */
  columns: [0.5, 0.8, 0.5, 0.2],
  /**
   * How far a label sits from the disc centre.
   *
   * Labels go *beside* each disc, never below it. Below-disc is the obvious
   * layout and it is wrong here: the space under a disc is the corridor the
   * trail travels through to the next one, so a label there collides with the
   * path itself.
   */
  labelOffset: 78,
  labelWidth: 118,
  gateWidth: 264,
  /** Stroke widths for the three stacked trail layers. */
  trailWidth: 14,
  trailDotWidth: 4,
  /** Page-coloured ring that separates a disc from the trail behind it. */
  discOutline: 4,
  /** Bottom padding so the finish marker is not flush with the scroll end. */
  tailSpace: 92,
} as const;

export interface BoardPoint {
  x: number;
  y: number;
}

export type BoardItem =
  | { kind: 'node'; index: number; x: number; y: number }
  | { kind: 'gate'; index: number; stage: number; x: number; y: number }
  | { kind: 'finish'; x: number; y: number };

/**
 * Places every disc, gate and the finish marker.
 *
 * A gate consumes its own row rather than floating between two discs, which is
 * what stops it overlapping the trail or the labels either side of it.
 */
export function layoutBoard(
  techniqueCount: number,
  gateEvery: number,
): { items: BoardItem[]; centres: BoardPoint[]; height: number } {
  const items: BoardItem[] = [];
  const centres: BoardPoint[] = [];
  let y = board.firstNodeY;

  for (let index = 0; index < techniqueCount; index += 1) {
    if (index > 0 && index % gateEvery === 0) {
      items.push({
        kind: 'gate',
        index,
        stage: index / gateEvery,
        x: board.width / 2,
        y: y + 6,
      });
      y += board.gateGap;
    }

    // The cycle length divides the index, so this is always in range - the
    // fallback exists only because noUncheckedIndexedAccess cannot see that.
    const column = board.columns[index % board.columns.length] ?? 0.5;
    const x = column * board.width;

    items.push({ kind: 'node', index, x, y });
    centres.push({ x, y });
    y += board.nodeGap;
  }

  items.push({ kind: 'finish', x: board.width / 2, y: y + 4 });

  return { items, centres, height: y + board.tailSpace };
}

/**
 * A cubic bezier through the disc centres, plus the cumulative straight-line
 * distance to each one.
 *
 * The lengths are what the progress fill is measured against. They are
 * chord lengths rather than true arc lengths, which understates each curve
 * slightly and uniformly - the fill lands a hair short of a disc's centre
 * rather than past it, which is the harmless direction to be wrong in.
 */
export function trailPath(centres: BoardPoint[]): {
  d: string;
  lengths: number[];
  total: number;
} {
  if (centres.length === 0) return { d: '', lengths: [0], total: 0 };

  const first = centres[0];
  if (!first) return { d: '', lengths: [0], total: 0 };

  let d = `M ${first.x} ${first.y}`;
  const lengths = [0];

  for (let index = 1; index < centres.length; index += 1) {
    const from = centres[index - 1];
    const to = centres[index];
    if (!from || !to) continue;

    // A minimum bend keeps the S-curve legible even between two discs in the
    // same column, where the vertical delta alone would draw a straight line.
    const bend = Math.max(40, (to.y - from.y) * 0.45);

    d += ` C ${from.x} ${from.y + bend} ${to.x} ${to.y - bend} ${to.x} ${to.y}`;
    lengths.push((lengths[index - 1] ?? 0) + Math.hypot(to.x - from.x, to.y - from.y));
  }

  return { d, lengths, total: lengths[lengths.length - 1] ?? 0 };
}

/** How far along the trail the fill should reach for this many completions. */
export function trailProgress(lengths: number[], total: number, doneCount: number): number {
  if (total === 0) return 0;

  const reached = lengths[Math.min(doneCount, lengths.length - 1)] ?? 0;

  return Math.min(reached / total, 1);
}
