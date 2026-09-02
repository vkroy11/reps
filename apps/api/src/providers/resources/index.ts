import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { QuotaRepository, ResourceCacheRepository } from '../../repositories/types';
import { withResourceCache } from './cached.provider';
import { createFakeResourceProvider } from './fake.provider';
import { createYouTubeProvider } from './youtube.provider';
import type { ResourceProvider } from './types';

export type { ResourceProvider, ResourceQuery } from './types';

export function createResourceProvider(repositories: {
  resourceCache: ResourceCacheRepository;
  quota: QuotaRepository;
}): ResourceProvider {
  if (!env.YOUTUBE_API_KEY) {
    logger.warn('YOUTUBE_API_KEY is not set - using the fake resource provider');

    return withResourceCache(createFakeResourceProvider(), repositories.resourceCache);
  }

  const youtube = createYouTubeProvider({
    apiKey: env.YOUTUBE_API_KEY,
    quota: repositories.quota,
    dailyUnitBudget: env.YOUTUBE_DAILY_UNIT_BUDGET,
  });

  return withResourceCache(youtube, repositories.resourceCache);
}
