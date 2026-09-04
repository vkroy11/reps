import type {
  Badge,
  GeneratedContentFormat,
  LearningPath,
  LearningPathSummary,
  Note,
  ResourceCandidate,
  TechniqueContent,
} from '@reps/core';
import { newId } from '../lib/ids';
import type {
  LearningPathWrite,
  PracticeSessionRecord,
  Repositories,
  User,
} from './types';

/**
 * In-memory implementations. These keep tests hermetic and let the API boot
 * with no database, which is how the app runs before DATABASE_URL is set.
 * Reads and writes are cloned so callers cannot mutate stored state by holding
 * a reference to it.
 */
export function createMemoryRepositories(): Repositories {
  const usersById = new Map<string, User>();
  /** Which learner a device currently speaks for. Re-pointed by a claim. */
  const userIdByDevice = new Map<string, string>();
  /**
   * Stored in write shape. `xp`, `badges` and `practiceMinutes` are not kept
   * here at all - they are summed from the session and badge stores on every
   * read, which is the same contract the Prisma implementation honours.
   */
  const pathsById = new Map<string, LearningPathWrite>();
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
  const notesById = new Map<string, Note>();
  const sessionsById = new Map<string, PracticeSessionRecord>();
  /** Keyed by `pathId:stage`, which is what makes awarding idempotent. */
  const badgesByStage = new Map<string, Badge>();

  const today = (): string => new Date().toISOString().slice(0, 10);
  const contentKey = (techniqueId: string, format: GeneratedContentFormat): string =>
    `${techniqueId}:${format}`;

  const totalsFor = (pathId: string) => {
    let xp = 0;
    const minutesByTechnique: Record<string, number> = {};

    for (const session of sessionsById.values()) {
      if (session.pathId !== pathId) continue;

      xp += session.xp;
      minutesByTechnique[session.techniqueId] =
        (minutesByTechnique[session.techniqueId] ?? 0) + session.minutes;
    }

    const badges = [...badgesByStage.values()]
      .filter((badge) => badge.pathId === pathId)
      .sort((left, right) => left.stage - right.stage);

    return { xp, badges, minutesByTechnique };
  };

  /** Puts the read-side aggregates back onto a stored path. */
  const hydrate = (stored: LearningPathWrite): LearningPath => {
    const { xp, badges, minutesByTechnique } = totalsFor(stored.id);

    return {
      ...stored,
      techniques: stored.techniques.map((technique) => ({
        ...technique,
        practiceMinutes: minutesByTechnique[technique.id] ?? 0,
      })),
      xp,
      badges,
    };
  };

  const toSummary = (path: LearningPath): LearningPathSummary => {
    const { techniques, ...rest } = path;

    return {
      ...rest,
      techniqueCount: techniques.length,
      completedCount: techniques.filter((technique) => technique.status === 'completed').length,
    };
  };

  /**
   * Timestamped notes come first in playback order; notes without a timestamp
   * sort after them by age, since they belong to the technique as a whole.
   */
  const byTimestampThenCreated = (left: Note, right: Note): number => {
    if (left.timestampSec === null && right.timestampSec === null) {
      return left.createdAt.localeCompare(right.createdAt);
    }
    if (left.timestampSec === null) return 1;
    if (right.timestampSec === null) return -1;

    return left.timestampSec - right.timestampSec;
  };

  return {
    users: {
      async findOrCreateByDeviceId(deviceId) {
        const existingUserId = userIdByDevice.get(deviceId);
        if (existingUserId) {
          const found = usersById.get(existingUserId);
          if (found) return { ...found };
        }

        const user: User = {
          id: newId('usr'),
          googleId: null,
          email: null,
          name: null,
          createdAt: new Date().toISOString(),
        };
        usersById.set(user.id, user);
        userIdByDevice.set(deviceId, user.id);

        return { ...user };
      },

      async findById(userId) {
        const found = usersById.get(userId);

        return found ? { ...found } : null;
      },

      async findByGoogleId(googleId) {
        for (const user of usersById.values()) {
          if (user.googleId === googleId) return { ...user };
        }

        return null;
      },

      async createWithGoogle(identity) {
        const user: User = {
          id: newId('usr'),
          googleId: identity.googleId,
          email: identity.email,
          name: identity.name,
          createdAt: new Date().toISOString(),
        };
        usersById.set(user.id, user);

        return { ...user };
      },

      async linkGoogle({ userId, googleId, email, name }) {
        const found = usersById.get(userId);
        if (!found) throw new Error(`No such user '${userId}'`);

        const linked: User = { ...found, googleId, email, name };
        usersById.set(userId, linked);

        return { ...linked };
      },

      async detachDevice(deviceId) {
        const fresh: User = {
          id: newId('usr'),
          googleId: null,
          email: null,
          name: null,
          createdAt: new Date().toISOString(),
        };
        usersById.set(fresh.id, fresh);
        userIdByDevice.set(deviceId, fresh.id);

        return { ...fresh };
      },

      async claimDevice({ deviceId, accountUserId }) {
        const account = usersById.get(accountUserId);
        if (!account) throw new Error(`No such account '${accountUserId}'`);

        const anonymousId = userIdByDevice.get(deviceId);
        userIdByDevice.set(deviceId, accountUserId);

        if (!anonymousId || anonymousId === accountUserId) return { ...account };

        // Re-key everything the anonymous user owned. Same rule as Prisma:
        // move ownership, never copy, and never delete.
        for (const [id, path] of pathsById) {
          if (path.userId === anonymousId) {
            pathsById.set(id, { ...path, userId: accountUserId });
          }
        }
        for (const [id, note] of notesById) {
          if (note.userId === anonymousId) {
            notesById.set(id, { ...note, userId: accountUserId });
          }
        }
        for (const [id, session] of sessionsById) {
          if (session.userId === anonymousId) {
            sessionsById.set(id, { ...session, userId: accountUserId });
          }
        }
        for (const [key, badge] of badgesByStage) {
          if (badge.userId === anonymousId) {
            badgesByStage.set(key, { ...badge, userId: accountUserId });
          }
        }

        const stillReferenced = [...userIdByDevice.values()].includes(anonymousId);
        if (!stillReferenced && usersById.get(anonymousId)?.googleId === null) {
          usersById.delete(anonymousId);
        }

        return { ...account };
      },
    },

    paths: {
      async save(path) {
        // Stamped here rather than by the caller so every write path gets it.
        const stamped: LearningPathWrite = { ...path, updatedAt: new Date().toISOString() };
        pathsById.set(stamped.id, structuredClone(stamped));
        savedSeqById.set(stamped.id, ++saveSeq);

        return hydrate(structuredClone(stamped));
      },

      async findById(id) {
        const found = pathsById.get(id);

        return found ? hydrate(structuredClone(found)) : null;
      },

      async findByTechniqueId(techniqueId) {
        for (const path of pathsById.values()) {
          if (path.techniques.some((technique) => technique.id === techniqueId)) {
            return hydrate(structuredClone(path));
          }
        }

        return null;
      },

      async listByUser(userId) {
        return [...pathsById.values()]
          .filter((path) => path.userId === userId)
          // Most recently practised first: that is what the home screen focuses on.
          .sort((left, right) => (savedSeqById.get(right.id) ?? 0) - (savedSeqById.get(left.id) ?? 0))
          .map((path) => toSummary(hydrate(structuredClone(path))));
      },
    },

    notes: {
      async create(note) {
        notesById.set(note.id, structuredClone(note));

        return structuredClone(note);
      },

      async findById(noteId) {
        const found = notesById.get(noteId);

        return found ? structuredClone(found) : null;
      },

      async listByTechnique(userId, techniqueId) {
        return [...notesById.values()]
          .filter((note) => note.userId === userId && note.techniqueId === techniqueId)
          .sort(byTimestampThenCreated)
          .map((note) => structuredClone(note));
      },

      async listByUser(userId) {
        const notes = [...notesById.values()]
          .filter((note) => note.userId === userId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

        return notes.map((note) => {
          // Resolve the technique the note hangs off, for the notebook view.
          for (const path of pathsById.values()) {
            const technique = path.techniques.find((item) => item.id === note.techniqueId);
            if (technique) {
              return {
                ...structuredClone(note),
                techniqueTitle: technique.title,
                pathId: path.id,
                skill: path.skill,
              };
            }
          }

          return {
            ...structuredClone(note),
            techniqueTitle: 'Unknown technique',
            pathId: '',
            skill: '',
          };
        });
      },

      async update(noteId, body) {
        const existing = notesById.get(noteId);
        if (!existing) throw new Error(`Note '${noteId}' not found`);

        const updated: Note = { ...existing, body, updatedAt: new Date().toISOString() };
        notesById.set(noteId, updated);

        return structuredClone(updated);
      },

      async remove(noteId) {
        notesById.delete(noteId);
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

    progress: {
      async recordSession(session) {
        sessionsById.set(session.id, structuredClone(session));

        return structuredClone(session);
      },

      async isFirstReflection(techniqueId) {
        for (const session of sessionsById.values()) {
          if (session.techniqueId === techniqueId) return false;
        }

        return true;
      },

      async awardBadge(badge) {
        const key = `${badge.pathId}:${badge.stage}`;
        if (badgesByStage.has(key)) return null;

        badgesByStage.set(key, structuredClone(badge));

        return structuredClone(badge);
      },

      async recentSessions(userId, limit) {
        return [...sessionsById.values()]
          .filter((session) => session.userId === userId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .slice(0, limit)
          .map((session) => ({
            at: session.createdAt,
            minutes: session.minutes,
            xp: session.xp,
            pathId: session.pathId,
            techniqueId: session.techniqueId,
            confidence: session.confidence,
          }));
      },

      async pathTotals(pathId) {
        return structuredClone(totalsFor(pathId));
      },

      async totalsForPaths(pathIds) {
        const totals: Record<string, { xp: number; badges: Badge[] }> = {};

        for (const pathId of pathIds) {
          const { xp, badges } = totalsFor(pathId);
          totals[pathId] = structuredClone({ xp, badges });
        }

        return totals;
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
