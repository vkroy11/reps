import { createAiProvider, type AiProvider } from './providers/ai';
import { createAuthProvider, type GoogleVerifier } from './providers/auth';
import {
  createResourceProvider,
  type ArticleProvider,
  type ResourceProvider,
} from './providers/resources';
import { createRepositories } from './repositories';
import type { Repositories } from './repositories/types';
import { createServices, type Services } from './services';

export interface Container {
  repositories: Repositories;
  services: Services;
}

/**
 * Composition root. Everything is wired here and nowhere else, which is what
 * lets tests swap in fake providers without touching a service.
 */
export function createContainer(
  overrides: {
    repositories?: Repositories;
    ai?: AiProvider;
    resources?: ResourceProvider;
    articles?: ArticleProvider;
    google?: GoogleVerifier;
  } = {},
): Container {
  const repositories = overrides.repositories ?? createRepositories();
  const ai = overrides.ai ?? createAiProvider();
  const sourced =
    overrides.resources && overrides.articles
      ? { resources: overrides.resources, articles: overrides.articles }
      : overrides.resources
        ? { resources: overrides.resources, articles: undefined }
        : createResourceProvider(repositories);
  const google = overrides.google ?? createAuthProvider();

  return {
    repositories,
    services: createServices({
      ai,
      resources: sourced.resources,
      articles: sourced.articles ?? overrides.articles,
      google,
      repositories,
    }),
  };
}
