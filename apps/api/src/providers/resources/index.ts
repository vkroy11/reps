import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { QuotaRepository, ResourceCacheRepository } from '../../repositories/types';
import { createArticleProvider, type ArticleProvider } from './article.provider';
import { withResourceCache } from './cached.provider';
import { createCompositeResourceProvider } from './composite.provider';
import { createFakeResourceProvider } from './fake.provider';
import { createYouTubeProvider } from './youtube.provider';
import type { ResourceProvider } from './types';

export type { ResourceProvider, ResourceQuery } from './types';
export type { ArticleProvider } from './article.provider';

export function createResourceProvider(repositories: {
  resourceCache: ResourceCacheRepository;
  quota: QuotaRepository;
}): { resources: ResourceProvider; articles: ArticleProvider } {
  const articles = createArticleProvider();

  if (!env.YOUTUBE_API_KEY) {
    logger.warn('YOUTUBE_API_KEY is not set - using the fake resource provider for video');
  }

  const video = env.YOUTUBE_API_KEY
    ? createYouTubeProvider({
        apiKey: env.YOUTUBE_API_KEY,
        quota: repositories.quota,
        dailyUnitBudget: env.YOUTUBE_DAILY_UNIT_BUDGET,
      })
    : createFakeResourceProvider();

  return {
    resources: withResourceCache(
      createCompositeResourceProvider({ video, article: articles }),
      repositories.resourceCache,
    ),
    articles,
  };
}
