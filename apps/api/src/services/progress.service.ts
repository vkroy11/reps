import type { PracticeEntry } from '@reps/core';
import type { Repositories } from '../repositories/types';

/**
 * How much history the streak and the week strip need.
 *
 * 400 days covers a full year plus a margin, which is the longest streak this
 * app could truthfully claim. Bounded rather than unbounded because the client
 * buckets these into local days itself, so the payload is real rows over the
 * wire - and one row per session is small, but not unlimited.
 */
const HISTORY_LIMIT = 400;

export function createProgressService(deps: { repositories: Repositories }) {
  return {
    /**
     * Raw practice history, newest first.
     *
     * Deliberately not a computed streak. A streak is a statement about the
     * learner's calendar, and the server does not know their timezone - see
     * packages/core/src/streak.ts for why passing one is worse than not.
     */
    async history(userId: string): Promise<PracticeEntry[]> {
      return deps.repositories.progress.recentSessions(userId, HISTORY_LIMIT);
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;
