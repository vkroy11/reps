import { resourceCacheKey } from '../../lib/cache-key';
import type { ResourceCacheRepository } from '../../repositories/types';
import type { ResourceProvider, ResourceQuery } from './types';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Caching decorator. This is what makes ~100 YouTube searches a day workable:
 * queries are normalized before hashing, so two learners starting the same
 * technique cost one search rather than two.
 */
export function withResourceCache(
  provider: ResourceProvider,
  cache: ResourceCacheRepository,
  ttlMs: number = DEFAULT_TTL_MS,
): ResourceProvider {
  return {
    name: `cached(${provider.name})`,

    async search(query: ResourceQuery) {
      const key = resourceCacheKey(query.text, query.language);
      const cached = await cache.find(key);

      if (cached && Date.now() - cached.cachedAt < ttlMs) {
        return cached.candidates;
      }

      const candidates = await provider.search(query);
      await cache.save(key, candidates);

      return candidates;
    },
  };
}
