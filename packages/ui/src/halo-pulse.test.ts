import { describe, expect, it } from 'vitest';
import { haloPulse } from './motion-curves';

/**
 * The active node's halo loops forever, so the seam between cycles is the only
 * thing that can make it look broken.
 *
 * Regression: the first version held its driver at 0 for the last 30% of each
 * cycle to make a rest gap - but 0 is the opaque end of the curve, so the ring
 * parked fully visible at rest size for half a second before every sweep. It
 * read as the animation freezing.
 */
describe('the halo pulse curve', () => {
  // Widened from the `as const` literal tuples so indexOf and the comparisons
  // below take plain numbers.
  const clock: number[] = [...haloPulse.clock];
  const opacity: number[] = [...haloPulse.opacity];
  const scale: number[] = [...haloPulse.scale];

  it('has one output per keyframe', () => {
    expect(opacity).toHaveLength(clock.length);
    expect(scale).toHaveLength(clock.length);
  });

  it('spans exactly one full cycle', () => {
    expect(clock[0]).toBe(0);
    expect(clock[clock.length - 1]).toBe(1);
  });

  it('advances monotonically, so interpolation is well defined', () => {
    for (let index = 1; index < clock.length; index += 1) {
      expect(clock[index]!).toBeGreaterThan(clock[index - 1]!);
    }
  });

  /**
   * The property that makes the loop seamless. The driver wraps from 1 straight
   * back to 0; if the halo were visible at either end, that wrap would show as
   * a pop once per cycle.
   */
  it('is fully transparent at both ends of the cycle', () => {
    expect(opacity[0]).toBe(0);
    expect(opacity[opacity.length - 1]).toBe(0);
  });

  it('is actually visible in the middle, or there would be no pulse', () => {
    expect(Math.max(...opacity)).toBeGreaterThan(0.2);
  });

  it('never fades back in after starting to fade out', () => {
    const peak = opacity.indexOf(Math.max(...opacity));

    for (let index = peak + 1; index < opacity.length; index += 1) {
      expect(opacity[index]!).toBeLessThanOrEqual(opacity[index - 1]!);
    }
  });

  /** Scale only ever grows: a ripple that shrank would read as the node moving. */
  it('expands and never contracts within a cycle', () => {
    expect(scale[0]).toBe(1);

    for (let index = 1; index < scale.length; index += 1) {
      expect(scale[index]!).toBeGreaterThanOrEqual(scale[index - 1]!);
    }
  });

  /** The jump back to scale 1 must happen while nothing is on screen. */
  it('has finished fading before it stops expanding', () => {
    const lastGrowth = scale.findIndex((value, index) => index > 0 && value === scale[index - 1]);

    expect(lastGrowth).toBeGreaterThan(0);
    expect(opacity[lastGrowth]).toBe(0);
  });
});
