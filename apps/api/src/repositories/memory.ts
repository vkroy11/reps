import type {
  GeneratedContentFormat,
  LearningPath,
  LearningPathSummary,
  ResourceCandidate,
  TechniqueContent,
} from '@reps/core';
import { newId } from '../lib/ids';
import type { Repositories, User } from './types';

/**
 * In-memory implementations. These keep tests hermetic and let the API boot
 * with no database, which is how the app runs before DATABASE_URL is set.
 * Reads and writes are cloned so callers cannot mutate stored state by holding
 * a reference to it.
 */
export function createMemoryRepositories(): Repositories {
  const usersByDeviceId = new Map<string, User>();
  const pathsById = new Map<string, LearningPath>();
  /**
   * Save order. `updatedAt` has millisecond resolution, so two saves in the
   * same millisecond tie and the focus order becomes arbitrary - this makes it
   * a total order.
   */
  const savedSeqById = new Map<string, number>();
  let saveSeq = 0;
  const contentByKey = new Map<string, TechniqueContent>();
  const resourceCache = new Map<string, { candidates: ResourceCandidate[]; cachedAt: number }>();
  const quotaByKey = new Map<string, number>();

  const today = (): string => new Date().toISOString().slice(0, 10);
  const contentKey = (techniqueId: string, format: GeneratedContentFormat): string =>
    `${techniqueId}:${format}`;

  const toSummary = (path: LearningPath): LearningPathSummary => {
    const { techniques, ...rest } = path;

    return {
      ...rest,
      techniqueCount: techniques.length,
      completedCount: techniques.filter((technique) => technique.status === 'completed').length,
    };
  };

  return {
    users: {
      async findOrCreateByDeviceId(deviceId) {
        const existing = usersByDeviceId.get(deviceId);
        if (existing) return { ...existing };

        const user: User = {
          id: newId('usr'),
          deviceId,
          createdAt: new Date().toISOString(),
        };
        usersByDeviceId.set(deviceId, user);

        return { ...user };
      },
    },

    paths: {
      async save(path) {
        // Stamped here rather than by the caller so every write path gets it.
        const stamped: LearningPath = { ...path, updatedAt: new Date().toISOString() };
        pathsById.set(stamped.id, structuredClone(stamped));
        savedSeqById.set(stamped.id, ++saveSeq);

        return structuredClone(stamped);
      },

      async findById(id) {
        const found = pathsById.get(id);

        return found ? structuredClone(found) : null;
      },

      async findByTechniqueId(techniqueId) {
        for (const path of pathsById.values()) {
          if (path.techniques.some((technique) => technique.id === techniqueId)) {
            return structuredClone(path);
          }
        }

        return null;
      },

      async listByUser(userId) {
        return [...pathsById.values()]
          .filter((path) => path.userId === userId)
          // Most recently practised first: that is what the home screen focuses on.
          .sort((left, right) => (savedSeqById.get(right.id) ?? 0) - (savedSeqById.get(left.id) ?? 0))
          .map(toSummary);
      },
    },

    techniqueContent: {
      async find(techniqueId, format) {
        const found = contentByKey.get(contentKey(techniqueId, format));

        return found ? structuredClone(found) : null;
      },

      async save(techniqueId, format, content) {
        contentByKey.set(contentKey(techniqueId, format), structuredClone(content));
      },
    },

    resourceCache: {
      async find(key) {
        const found = resourceCache.get(key);

        return found ? structuredClone(found) : null;
      },

      async save(key, candidates) {
        resourceCache.set(key, { candidates: structuredClone(candidates), cachedAt: Date.now() });
      },
    },

    quota: {
      async consumedToday(resource) {
        return quotaByKey.get(`${resource}:${today()}`) ?? 0;
      },

      async consume(resource, units) {
        const key = `${resource}:${today()}`;
        quotaByKey.set(key, (quotaByKey.get(key) ?? 0) + units);
      },
    },
  };
}
