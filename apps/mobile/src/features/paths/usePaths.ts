import { ApiError, resolveFocusedPathId } from '@reps/client';
import type { LearningPath, LearningPathSummary } from '@reps/core';
import { useCallback, useEffect } from 'react';
import { useApp } from '../../providers/app-provider';
import { usePathCache } from './path-cache';

interface PathListState {
  paths: LearningPathSummary[];
  focusedId: string | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Every path the learner has, most recently practised first, plus which one
 * the home screen should focus on.
 *
 * A reader over the shared cache rather than its own fetch. Several screens
 * ask for this at once and they must agree - and a mutation on one of them has
 * to be visible on the others without a reload.
 */
export function usePathList(): PathListState {
  const { focusedPathId } = useApp();
  const { summaries, listError, ensureList, refreshList } = usePathCache();

  useEffect(() => {
    ensureList();
  }, [ensureList]);

  return {
    paths: summaries ?? [],
    focusedId: resolveFocusedPathId(summaries ?? [], focusedPathId),
    error: listError,
    loading: summaries === null && listError === null,
    reload: refreshList,
  };
}

interface PathState {
  path: LearningPath | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * One path with its techniques and resources.
 *
 * Served from memory once fetched, so switching skills back and forth costs
 * nothing and shows no skeleton for data already held.
 */
export function usePath(pathId: string | null): PathState {
  const { pathsById, errorsById, ensurePath, refreshPath } = usePathCache();

  useEffect(() => {
    if (pathId) ensurePath(pathId);
  }, [pathId, ensurePath]);

  const path = pathId ? (pathsById[pathId] ?? null) : null;
  const error = pathId ? (errorsById[pathId] ?? null) : null;

  return {
    path,
    error,
    loading: Boolean(pathId) && path === null && error === null,
    reload: useCallback(() => {
      if (pathId) refreshPath(pathId);
    }, [pathId, refreshPath]),
  };
}
