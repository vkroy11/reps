import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepositories } from '../../repositories/memory';
import { createYouTubeProvider, decodeHtml, parseIsoDuration } from './youtube.provider';

describe('parseIsoDuration', () => {
  it.each([
    ['PT8M31S', 511],
    ['PT1H2M3S', 3723],
    ['PT45S', 45],
    ['PT2H', 7200],
  ])('parses %s', (input, expected) => {
    expect(parseIsoDuration(input)).toBe(expected);
  });

  it('returns null for anything unexpected', () => {
    expect(parseIsoDuration('8 minutes')).toBeNull();
  });
});

describe('createYouTubeProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * search.list costs 100 of 10,000 daily units. Refusing before the request
   * is what keeps a runaway loop from spending the day's quota.
   */
  it('refuses to search once the daily budget is spent', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const repositories = createMemoryRepositories();
    await repositories.quota.consume('youtube', 250);

    const provider = createYouTubeProvider({
      apiKey: 'test-key',
      quota: repositories.quota,
      dailyUnitBudget: 300,
    });

    await expect(provider.search({ text: 'guitar', language: 'en' })).rejects.toMatchObject({
      code: 'QuotaExhausted',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('charges the search and the duration lookup against the budget', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | string) => {
        const url = String(input);

        if (url.includes('/search')) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: { videoId: 'abc123' },
                  snippet: {
                    title: 'Chord transitions',
                    description: 'A drill',
                    channelTitle: 'Some Channel',
                    thumbnails: { medium: { url: 'https://img.test/abc123.jpg' } },
                  },
                },
              ],
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({ items: [{ id: 'abc123', contentDetails: { duration: 'PT6M40S' } }] }),
          { status: 200 },
        );
      }),
    );

    const repositories = createMemoryRepositories();
    const provider = createYouTubeProvider({
      apiKey: 'test-key',
      quota: repositories.quota,
      dailyUnitBudget: 1000,
    });

    const results = await provider.search({ text: 'chord transitions', language: 'en' });

    expect(results).toEqual([
      {
        id: 'abc123',
        format: 'video',
        title: 'Chord transitions',
        url: 'https://www.youtube.com/watch?v=abc123',
        thumbnailUrl: 'https://img.test/abc123.jpg',
        source: 'Some Channel',
        durationSec: 400,
        description: 'A drill',
      },
    ]);
    expect(await repositories.quota.consumedToday('youtube')).toBe(101);
  });

  it('treats a 403 as an exhausted quota rather than a server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 403 })),
    );

    const repositories = createMemoryRepositories();
    const provider = createYouTubeProvider({
      apiKey: 'test-key',
      quota: repositories.quota,
      dailyUnitBudget: 1000,
    });

    await expect(provider.search({ text: 'guitar', language: 'en' })).rejects.toMatchObject({
      code: 'QuotaExhausted',
    });
  });
});

/**
 * The API predates everyone consuming it as JSON, so snippet text comes back
 * HTML-escaped. Stored raw, "Just Flour &amp; Water" is what the learner reads.
 */
describe('decoding what YouTube actually sends', () => {
  it('decodes the entities the API emits', () => {
    expect(decodeHtml('Just Flour &amp; Water')).toBe('Just Flour & Water');
    expect(decodeHtml('Paul&#39;s Sourdough Guide')).toBe("Paul's Sourdough Guide");
    expect(decodeHtml('&quot;Open crumb&quot;')).toBe('"Open crumb"');
    expect(decodeHtml('a &lt; b &gt; c')).toBe('a < b > c');
  });

  it('handles hex references', () => {
    expect(decodeHtml('Caf&#xE9; sourdough')).toBe('Café sourdough');
  });

  it('leaves ordinary text alone', () => {
    expect(decodeHtml('Sourdough for beginners')).toBe('Sourdough for beginners');
  });

  /** A bare ampersand in a title is common and must not be mangled. */
  it('leaves a non-entity ampersand alone', () => {
    expect(decodeHtml('Salt & pepper')).toBe('Salt & pepper');
    expect(decodeHtml('Q&A')).toBe('Q&A');
  });

  it('leaves an entity it does not know alone rather than dropping it', () => {
    expect(decodeHtml('50 &deg; C')).toBe('50 &deg; C');
    expect(decodeHtml('&#xZZZZ;')).toBe('&#xZZZZ;');
  });

  it('decodes several in one string', () => {
    expect(decodeHtml('Tom&#39;s &quot;best&quot; bread &amp; butter')).toBe(
      'Tom\'s "best" bread & butter',
    );
  });
});
