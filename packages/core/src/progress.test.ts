import { describe, expect, it } from 'vitest';
import type { Technique } from './domain';
import {
  capstoneOf,
  clearedStages,
  creditedMinutes,
  GATE_EVERY,
  gateSize,
  masteryOf,
  stageCount,
  stageOf,
  XP_FIRST_REFLECTION,
  XP_MAX_CREDITED_MINUTES,
  XP_PER_MINUTE,
  xpForSession,
} from './progress';

function technique(overrides: Partial<Technique> & { id: string; title: string }): Technique {
  return {
    pathId: 'path_1',
    order: 0,
    whyItMatters: 'because',
    modality: 'watch_and_do',
    practicePrompt: 'do the thing',
    estimatedMinutes: 20,
    status: 'locked',
    confidence: null,
    struggleCount: 0,
    practiceMinutes: 0,
    bridgeForTechniqueId: null,
    searchQueries: [],
    resources: [],
    ...overrides,
  };
}

describe('credited minutes', () => {
  it('counts what was practised', () => {
    expect(creditedMinutes(20)).toBe(20);
  });

  it('floors a partial minute rather than rounding up', () => {
    expect(creditedMinutes(19.9)).toBe(19);
  });

  /** The client reports this, so it is not trustworthy input. */
  it('caps an implausible claim', () => {
    expect(creditedMinutes(600)).toBe(XP_MAX_CREDITED_MINUTES);
  });

  it('treats nonsense as nothing', () => {
    expect(creditedMinutes(-5)).toBe(0);
    expect(creditedMinutes(Number.NaN)).toBe(0);
    expect(creditedMinutes(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('XP for a session', () => {
  it('pays for time practised plus a first-reflection bonus', () => {
    expect(xpForSession({ minutes: 20, firstReflection: true })).toBe(
      20 * XP_PER_MINUTE + XP_FIRST_REFLECTION,
    );
  });

  it('drops the bonus on a repeat of the same technique', () => {
    expect(xpForSession({ minutes: 20, firstReflection: false })).toBe(20 * XP_PER_MINUTE);
  });

  it('still pays the bonus when no timer ran', () => {
    expect(xpForSession({ minutes: 0, firstReflection: true })).toBe(XP_FIRST_REFLECTION);
  });

  it('pays nothing for a repeat with no practice', () => {
    expect(xpForSession({ minutes: 0, firstReflection: false })).toBe(0);
  });

  /**
   * The load-bearing property of the whole game layer. If "solid" paid better
   * than "struggling", the app would be paying people to overstate how it went
   * - and confidence is the only signal the adaptation engine reads.
   */
  it('cannot be influenced by confidence, because confidence is not an input', () => {
    /*
      Called, not inspected. This assertion used to check `xpForSession.length`
      and then the keys of an object literal written on the line above - a
      tautology that would have stayed green while "solid" paid double.
    */
    const award = (confidence: string) =>
      (xpForSession as (input: Record<string, unknown>) => number)({
        minutes: 20,
        firstReflection: true,
        confidence,
      });

    expect(award('solid')).toBe(award('struggling'));
    expect(award('solid')).toBe(award('getting_there'));
    expect(award('solid')).toBe(xpForSession({ minutes: 20, firstReflection: true }));
  });
});

describe('stages and gates', () => {
  it('groups techniques in threes', () => {
    expect(GATE_EVERY).toBe(3);
    expect(stageOf(0)).toBe(1);
    expect(stageOf(2)).toBe(1);
    expect(stageOf(3)).toBe(2);
    expect(stageOf(5)).toBe(2);
    expect(stageOf(6)).toBe(3);
  });

  /** Five techniques are two stages, the second short - not one stage. */
  it('counts a trailing partial stage', () => {
    expect(stageCount(3)).toBe(1);
    expect(stageCount(5)).toBe(2);
    expect(stageCount(6)).toBe(2);
    expect(stageCount(7)).toBe(3);
  });

  it('has no stages in an empty path', () => {
    expect(stageCount(0)).toBe(0);
  });

  it('clears a stage on every third completion', () => {
    expect(clearedStages(0, 6)).toBe(0);
    expect(clearedStages(2, 6)).toBe(0);
    expect(clearedStages(3, 6)).toBe(1);
    expect(clearedStages(5, 6)).toBe(1);
    expect(clearedStages(6, 6)).toBe(2);
  });

  /**
   * A five-technique path has a short second stage of two. Finishing all five
   * clears it - floor division alone never would, and since the server awards
   * the badge for stage `clearedStages(...)`, the last badge on any path whose
   * length is not a multiple of three would otherwise never be granted.
   */
  it('clears a short final stage once the path is finished', () => {
    expect(clearedStages(4, 5)).toBe(1);
    expect(clearedStages(5, 5)).toBe(2);
  });

  it('never reports more stages cleared than the path has', () => {
    expect(clearedStages(99, 5)).toBe(2);
    expect(clearedStages(99, 0)).toBe(0);
  });

  /** A gate cannot promise more techniques than the stage actually holds. */
  it('sizes the last gate to what is left of the path', () => {
    expect(gateSize(6, 1)).toBe(3);
    expect(gateSize(6, 2)).toBe(3);
    expect(gateSize(5, 2)).toBe(2);
    expect(gateSize(5, 3)).toBe(0);
    expect(gateSize(0, 1)).toBe(0);
  });
});

describe('the capstone that names a badge', () => {
  const techniques = [
    technique({ id: 't1', title: 'Open chords' }),
    technique({ id: 't2', title: 'Chord transitions' }),
    technique({ id: 't3', title: 'Strumming patterns' }),
    technique({ id: 't4', title: 'Barre chords' }),
    technique({ id: 't5', title: 'Fingerpicking' }),
  ];

  it('is the last technique of the stage', () => {
    expect(capstoneOf(techniques, 1)?.title).toBe('Strumming patterns');
  });

  /** A stage cut short by the end of the path capstones on its final step. */
  it('falls back to the last technique for a short final stage', () => {
    expect(capstoneOf(techniques, 2)?.title).toBe('Fingerpicking');
  });

  it('is null for a stage the path does not have', () => {
    expect(capstoneOf(techniques, 9)?.title).toBe('Fingerpicking');
    expect(capstoneOf([], 1)).toBeNull();
  });
});

describe('mastery', () => {
  it('is nothing until the technique has been practised', () => {
    expect(masteryOf({ practiceMinutes: 0, estimatedMinutes: 20 })).toBe(0);
  });

  it('is practice against the estimate', () => {
    expect(masteryOf({ practiceMinutes: 5, estimatedMinutes: 20 })).toBe(0.25);
  });

  it('does not exceed full', () => {
    expect(masteryOf({ practiceMinutes: 90, estimatedMinutes: 20 })).toBe(1);
  });

  it('survives a zero estimate rather than dividing by it', () => {
    expect(masteryOf({ practiceMinutes: 10, estimatedMinutes: 0 })).toBe(0);
  });
});
