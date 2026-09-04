import type { LearningPath, LearningPathSummary, OnboardingInput } from '@reps/core';
import { NotFoundError } from '../lib/errors';
import { newId } from '../lib/ids';
import type { AiProvider } from '../providers/ai';
import type { LearningPathWrite, Repositories } from '../repositories/types';
import { toTechnique } from './context';
import type { ResourceCurator } from './resource-curator.service';

/**
 * Resources are only fetched upfront for the techniques the learner will
 * actually reach today. The rest are curated when opened, which keeps path
 * creation fast and protects the YouTube quota from techniques nobody reaches.
 */
const EAGERLY_CURATED_TECHNIQUES = 2;

export function createPathService(deps: {
  ai: AiProvider;
  curator: ResourceCurator;
  repositories: Repositories;
}) {
  return {
    async create(userId: string, input: OnboardingInput): Promise<LearningPath> {
      const generated = await deps.ai.generatePath(input);
      const pathId = newId('path');

      const path: LearningPathWrite = {
        id: pathId,
        userId,
        skill: input.skill,
        archetype: generated.archetype,
        goal: input.goal,
        level: input.level,
        dailyMinutes: input.dailyMinutes,
        daysPerWeek: input.daysPerWeek,
        preferredFormats: input.preferredFormats,
        language: input.language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        techniques: generated.techniques.map((technique, index) =>
          toTechnique(technique, {
            pathId,
            order: index,
            status: index === 0 ? 'active' : 'locked',
            archetype: generated.archetype,
          }),
        ),
      };

      // Sequential on purpose. Curating in parallel bursts straight through a
      // per-minute token limit, and the retry that follows is slower than
      // just pacing the calls.
      for (const technique of path.techniques.slice(0, EAGERLY_CURATED_TECHNIQUES)) {
        technique.resources = await deps.curator.curate(path, technique);
      }

      return deps.repositories.paths.save(path);
    },

    /**
     * Ownership is enforced here rather than in the route, and a path owned by
     * someone else is reported as missing rather than forbidden so the API does
     * not confirm that an id exists.
     */
    async getOwned(userId: string, pathId: string): Promise<LearningPath> {
      const path = await deps.repositories.paths.findById(pathId);

      if (!path || path.userId !== userId) throw new NotFoundError('LearningPath', pathId);

      return path;
    },

    async list(userId: string): Promise<LearningPathSummary[]> {
      return deps.repositories.paths.listByUser(userId);
    },
  };
}

export type PathService = ReturnType<typeof createPathService>;
