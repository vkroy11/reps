import { describe, expect, it } from 'vitest';
import { normalizeQuery, resourceCacheKey } from './cache-key';

describe('normalizeQuery', () => {
  it('ignores case, punctuation, spacing and word order', () => {
    expect(normalizeQuery('Beginner Guitar  chord-transitions!')).toBe(
      normalizeQuery('chord transitions beginner guitar'),
    );
  });
});

describe('resourceCacheKey', () => {
  it('matches equivalent queries so a search is paid for once', () => {
    expect(resourceCacheKey('beginner guitar chords', 'en')).toBe(
      resourceCacheKey('Guitar chords, beginner', 'EN'),
    );
  });

  it('separates different languages', () => {
    expect(resourceCacheKey('beginner guitar chords', 'en')).not.toBe(
      resourceCacheKey('beginner guitar chords', 'hi'),
    );
  });

  it('separates genuinely different queries', () => {
    expect(resourceCacheKey('beginner guitar chords', 'en')).not.toBe(
      resourceCacheKey('advanced fingerpicking patterns', 'en'),
    );
  });
});
