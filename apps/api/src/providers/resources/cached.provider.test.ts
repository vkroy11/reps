import { describe, expect, it, vi } from 'vitest';
import { createMemoryRepositories } from '../../repositories/memory';
import { withResourceCache } from './cached.provider';
import type { ResourceProvider } from './types';

function countingProvider(): ResourceProvider & { calls: () => number } {
  const search = vi.fn(async () => [
    {
      id: 'video-1',
      format: 'video' as const,
      title: 'Result',
      url: 'https://example.test/1',
      thumbnailUrl: null,
      source: 'Test',
      durationSec: 300,
      description: null,
    },
  ]);

  return { name: 'counting', search, calls: () => search.mock.calls.length };
}

describe('withResourceCache', () => {
  it('serves a repeated query from cache', async () => {
    const inner = countingProvider();
    const cached = withResourceCache(inner, createMemoryRepositories().resourceCache);

    const first = await cached.search({ text: 'beginner guitar chords', language: 'en' });
    const second = await cached.search({ text: 'beginner guitar chords', language: 'en' });

    expect(second).toEqual(first);
    expect(inner.calls()).toBe(1);
  });

  /** The point of normalizing: YouTube allows only ~100 searches a day. */
  it('shares one search between equivalent queries', async () => {
    const inner = countingProvider();
    const cached = withResourceCache(inner, createMemoryRepositories().resourceCache);

    await cached.search({ text: 'beginner guitar chords', language: 'en' });
    await cached.search({ text: 'Guitar chords, beginner!', language: 'en' });

    expect(inner.calls()).toBe(1);
  });

  it('still searches for a different query', async () => {
    const inner = countingProvider();
    const cached = withResourceCache(inner, createMemoryRepositories().resourceCache);

    await cached.search({ text: 'beginner guitar chords', language: 'en' });
    await cached.search({ text: 'barre chord exercises', language: 'en' });

    expect(inner.calls()).toBe(2);
  });

  it('re-searches once the entry is stale', async () => {
    const inner = countingProvider();
    const cached = withResourceCache(inner, createMemoryRepositories().resourceCache, 0);

    await cached.search({ text: 'beginner guitar chords', language: 'en' });
    await cached.search({ text: 'beginner guitar chords', language: 'en' });

    expect(inner.calls()).toBe(2);
  });
});
