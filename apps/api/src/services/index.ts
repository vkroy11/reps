import type { AiProvider } from '../providers/ai';
import type { GoogleVerifier } from '../providers/auth/types';
import type { ResourceProvider } from '../providers/resources';
import type { Repositories } from '../repositories/types';
import { createAuthService, type AuthService } from './auth.service';
import { createContentService, type ContentService } from './content.service';
import { createNoteService, type NoteService } from './note.service';
import { createOnboardingService, type OnboardingService } from './onboarding.service';
import { createPathService, type PathService } from './path.service';
import { createProgressService, type ProgressService } from './progress.service';
import { createResourceCurator } from './resource-curator.service';
import { createTechniqueService, type TechniqueService } from './technique.service';

export interface Services {
  onboarding: OnboardingService;
  paths: PathService;
  techniques: TechniqueService;
  content: ContentService;
  notes: NoteService;
  progress: ProgressService;
  auth: AuthService;
}

export function createServices(deps: {
  ai: AiProvider;
  resources: ResourceProvider;
  google: GoogleVerifier;
  repositories: Repositories;
}): Services {
  const curator = createResourceCurator({ ai: deps.ai, resources: deps.resources });

  const paths = createPathService({
    ai: deps.ai,
    curator,
    repositories: deps.repositories,
  });

  const techniques = createTechniqueService({
    ai: deps.ai,
    curator,
    repositories: deps.repositories,
  });

  const content = createContentService({
    ai: deps.ai,
    techniques,
    repositories: deps.repositories,
  });

  return {
    onboarding: createOnboardingService({ ai: deps.ai }),
    paths,
    techniques,
    content,
    notes: createNoteService({ repositories: deps.repositories, techniques }),
    progress: createProgressService({ repositories: deps.repositories }),
    auth: createAuthService({ google: deps.google, repositories: deps.repositories }),
  };
}
