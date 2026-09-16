import { createHash } from 'node:crypto';
import type { ResourceProvider, ResourceQuery } from './types';

/** Deterministic candidates so tests and keyless runs exercise the real pipeline. */
export function createFakeResourceProvider(): ResourceProvider {
  return {
    name: 'fake',

    async search(query: ResourceQuery) {
      const seed = createHash('sha256').update(query.text).digest('hex').slice(0, 8);
      const article = query.format === 'article';

      return Array.from({ length: 3 }, (_unused, index) => ({
        id: `${article ? 'art' : 'vid'}-${seed}-${index}`,
        format: article ? ('article' as const) : ('video' as const),
        title: `${query.text} (sample ${article ? 'article' : 'result'} ${index + 1})`,
        url: article
          ? `https://example.test/articles/${seed}-${index}`
          : `https://example.test/watch?v=${seed}-${index}`,
        thumbnailUrl: null,
        source: 'Fake provider',
        durationSec: article ? null : 240 + index * 120,
        description: 'Placeholder candidate returned when no resource API key is configured.',
      }));
    },
  };
}
