import { describe, expect, it } from 'vitest';
import {
  coerceModality,
  defaultModalityFor,
  explainModalityOverride,
  generatedContentFormatFor,
  isModalityAllowedFor,
  resolveFormats,
} from './modality';

describe('defaultModalityFor', () => {
  it('maps each archetype to how that kind of skill is actually learned', () => {
    expect(defaultModalityFor('motor')).toBe('watch_and_do');
    expect(defaultModalityFor('strategic')).toBe('drill');
    expect(defaultModalityFor('recall')).toBe('flashcards');
    expect(defaultModalityFor('craft')).toBe('produce_and_critique');
  });
});

describe('resolveFormats', () => {
  it('honours a preference the modality can carry', () => {
    expect(resolveFormats('watch_and_do', ['video', 'flashcards'])).toEqual(['video']);
  });

  it('overrides a preference the modality cannot carry', () => {
    // Reading about strumming does not teach timing.
    expect(resolveFormats('watch_and_do', ['article'])).toEqual(['video', 'drill']);
  });

  it('falls back to the modality default when nothing is preferred', () => {
    expect(resolveFormats('flashcards', [])).toEqual(['flashcards', 'video', 'ai_lesson']);
  });

  /**
   * Cards test whether you know something; they do not teach it. A recall
   * technique that sourced no lesson dropped the learner straight into an exam.
   */
  it('lets a recall technique source a lesson to go with the deck', () => {
    expect(resolveFormats('flashcards', [])).toContain('video');
  });
});

describe('explainModalityOverride', () => {
  it('says nothing when the preference was respected', () => {
    expect(explainModalityOverride('Strumming', 'watch_and_do', ['video'])).toBeNull();
  });

  it('says nothing when no preference was given', () => {
    expect(explainModalityOverride('Strumming', 'watch_and_do', [])).toBeNull();
  });

  it('explains why a hands-on technique is not a reading exercise', () => {
    const explanation = explainModalityOverride('Strumming patterns', 'watch_and_do', ['article']);

    expect(explanation).toContain('Strumming patterns');
    expect(explanation).toMatch(/do, not read about/);
  });

  it('explains a non-passive mismatch more generally', () => {
    // Drill, not video: a recall technique now carries a video lesson, so
    // video is no longer an override there.
    expect(explainModalityOverride('Opening traps', 'flashcards', ['drill'])).toContain(
      'different format',
    );
  });

  it('stays quiet about video on a recall technique, which now carries one', () => {
    expect(explainModalityOverride('Opening traps', 'flashcards', ['video'])).toBeNull();
  });
});

describe('coerceModality', () => {
  /**
   * A model suggested "chord sequence recall" as flashcards for guitar. Chord
   * changes are a motor problem, so the combination is rewritten rather than
   * trusted - this is the MCQ-for-chess mistake in a different costume.
   */
  it('rewrites flashcards on a physical skill', () => {
    expect(isModalityAllowedFor('motor', 'flashcards')).toBe(false);
    expect(coerceModality('motor', 'flashcards')).toBe('watch_and_do');
    expect(coerceModality('craft', 'flashcards')).toBe('produce_and_critique');
  });

  it('allows flashcards where recall genuinely is the skill', () => {
    expect(isModalityAllowedFor('recall', 'flashcards')).toBe(true);
    expect(coerceModality('recall', 'flashcards')).toBe('flashcards');
  });

  /** Mixing modalities is good pedagogy: warm up, drill, then perform. */
  it('leaves other legitimate mixes alone', () => {
    expect(coerceModality('motor', 'drill')).toBe('drill');
    expect(coerceModality('motor', 'produce_and_critique')).toBe('produce_and_critique');
    expect(coerceModality('strategic', 'watch_and_do')).toBe('watch_and_do');
  });
});

describe('generatedContentFormatFor', () => {
  it('gives motor and craft work a drill rather than an essay', () => {
    expect(generatedContentFormatFor('watch_and_do')).toBe('drill');
    expect(generatedContentFormatFor('produce_and_critique')).toBe('drill');
  });

  it('gives recall work flashcards', () => {
    expect(generatedContentFormatFor('flashcards')).toBe('flashcards');
  });
});
