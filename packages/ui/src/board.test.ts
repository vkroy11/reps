import { describe, expect, it } from 'vitest';
import { board, layoutBoard, trailPath, trailProgress } from './board';

const GATE_EVERY = 3;

describe('board layout', () => {
  it('places one disc per technique plus a finish marker', () => {
    const { items, centres } = layoutBoard(4, GATE_EVERY);

    expect(centres).toHaveLength(4);
    expect(items.filter((item) => item.kind === 'node')).toHaveLength(4);
    expect(items.filter((item) => item.kind === 'finish')).toHaveLength(1);
  });

  it('drops a gate after every third technique, but not before the first', () => {
    const gates = (count: number) =>
      layoutBoard(count, GATE_EVERY).items.filter((item) => item.kind === 'gate');

    expect(gates(3)).toHaveLength(0);
    expect(gates(4)).toHaveLength(1);
    expect(gates(6)).toHaveLength(1);
    expect(gates(7)).toHaveLength(2);
  });

  it('numbers each gate with the stage it closes', () => {
    const gates = layoutBoard(7, GATE_EVERY).items.filter((item) => item.kind === 'gate');

    expect(gates.map((gate) => gate.kind === 'gate' && gate.stage)).toEqual([1, 2]);
  });

  it('serpentines rather than stacking in one column', () => {
    const { centres } = layoutBoard(4, GATE_EVERY);
    const xs = centres.map((centre) => centre.x);

    expect(new Set(xs).size).toBeGreaterThan(1);
    expect(xs[0]).toBe(board.width / 2);
  });

  /** A gate needs its own row, or it lands on top of the trail below a disc. */
  it('gives a gate row its own vertical space', () => {
    const withoutGate = layoutBoard(3, GATE_EVERY);
    const withGate = layoutBoard(4, GATE_EVERY);
    const extra = withGate.height - withoutGate.height;

    expect(extra).toBe(board.nodeGap + board.gateGap);
  });

  it('always descends', () => {
    const { centres } = layoutBoard(8, GATE_EVERY);

    for (let index = 1; index < centres.length; index += 1) {
      expect(centres[index]!.y).toBeGreaterThan(centres[index - 1]!.y);
    }
  });

  it('survives a path with nothing in it', () => {
    const { items, centres, height } = layoutBoard(0, GATE_EVERY);

    expect(centres).toHaveLength(0);
    expect(items).toEqual([{ kind: 'finish', x: board.width / 2, y: board.firstNodeY + 4 }]);
    expect(height).toBeGreaterThan(0);
  });
});

describe('the trail', () => {
  it('starts at the first disc and curves to each one after it', () => {
    const { centres } = layoutBoard(3, GATE_EVERY);
    const { d } = trailPath(centres);

    expect(d.startsWith(`M ${centres[0]!.x} ${centres[0]!.y}`)).toBe(true);
    expect(d.match(/C /g)).toHaveLength(2);
  });

  it('accumulates a length per disc', () => {
    const { centres } = layoutBoard(4, GATE_EVERY);
    const { lengths, total } = trailPath(centres);

    expect(lengths).toHaveLength(4);
    expect(lengths[0]).toBe(0);
    expect(total).toBe(lengths[3]);
  });

  it('draws nothing for an empty path rather than throwing', () => {
    expect(trailPath([])).toEqual({ d: '', lengths: [0], total: 0 });
  });

  it('draws a single disc as a bare move, with no curve', () => {
    const { d, total } = trailPath([{ x: 10, y: 20 }]);

    expect(d).toBe('M 10 20');
    expect(total).toBe(0);
  });
});

describe('trail progress', () => {
  const { centres } = layoutBoard(4, GATE_EVERY);
  const { lengths, total } = trailPath(centres);

  it('is empty before anything is completed', () => {
    expect(trailProgress(lengths, total, 0)).toBe(0);
  });

  it('reaches the end when every technique is done', () => {
    expect(trailProgress(lengths, total, 4)).toBe(1);
  });

  it('grows with each completion', () => {
    const one = trailProgress(lengths, total, 1);
    const two = trailProgress(lengths, total, 2);

    expect(one).toBeGreaterThan(0);
    expect(two).toBeGreaterThan(one);
  });

  /** A count past the end must clamp, not read off the array. */
  it('clamps a count beyond the path length', () => {
    expect(trailProgress(lengths, total, 99)).toBe(1);
  });

  it('is empty on a path with no trail to fill', () => {
    expect(trailProgress([0], 0, 3)).toBe(0);
  });
});
