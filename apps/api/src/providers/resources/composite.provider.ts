import type { ResourceProvider, ResourceQuery } from './types';

/**
 * One ResourceProvider that routes by format. Search queries stay format-
 * specific so a YouTube cache entry can never be served as an article.
 */
export function createCompositeResourceProvider(providers: {
  video: ResourceProvider;
  article: ResourceProvider;
}): ResourceProvider {
  return {
    name: `composite(${providers.video.name}+${providers.article.name})`,

    async search(query: ResourceQuery) {
      if (query.format === 'article') return providers.article.search(query);

      return providers.video.search(query);
    },
  };
}
