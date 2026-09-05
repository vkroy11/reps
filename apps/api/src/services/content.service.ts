import {
  generatedContentFormatFor,
  type GeneratedContentFormat,
  type TechniqueContent,
} from '@reps/core';
import type { AiProvider } from '../providers/ai';
import type { Repositories } from '../repositories/types';
import { toPathContext } from './context';
import type { TechniqueService } from './technique.service';

export function createContentService(deps: {
  ai: AiProvider;
  techniques: TechniqueService;
  repositories: Repositories;
}) {
  return {
    /**
     * Generated content is produced when a technique is opened, not when the
     * path is created: most learners never reach technique eight, and generating
     * it upfront would slow onboarding and spend tokens on work nobody reads.
     * Once generated it is stored, so a second visit costs nothing.
     */
    async get(
      userId: string,
      techniqueId: string,
      requestedFormat?: GeneratedContentFormat,
      options: { fresh?: boolean } = {},
    ): Promise<TechniqueContent> {
      const { path, technique } = await deps.techniques.locate(userId, techniqueId);
      const format = requestedFormat ?? generatedContentFormatFor(technique.modality);

      const cached = await deps.repositories.techniqueContent.find(techniqueId, format);
      if (cached && !options.fresh) return cached;

      /*
        A repeat gets a new variant rather than the stored one. Drilling the
        same deck in the same order stops measuring recall of the answers and
        starts measuring recall of the list - so the previous attempt is handed
        to the model as the thing to vary against, and replaces it once written.
      */
      const content = await deps.ai.generateContent({
        context: toPathContext(path),
        technique: {
          title: technique.title,
          whyItMatters: technique.whyItMatters,
          practicePrompt: technique.practicePrompt,
          modality: technique.modality,
        },
        format,
        ...(cached ? { previous: cached } : {}),
      });

      await deps.repositories.techniqueContent.save(techniqueId, format, content);

      return content;
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;
