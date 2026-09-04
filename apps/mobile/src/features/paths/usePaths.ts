import { ApiError, orderPaths, resolveFocusedPathId } from '@reps/client';
import type { LearningPath, LearningPathSummary } from '@reps/core';
import { useCallback, useEffect, useMemo } from 'react';
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

  // Ordered once, here, so the pager, the focus default and the switcher all
  // agree about which hobby comes first.
  const paths = useMemo(() => orderPaths(summaries ?? []), [summaries]);

  return {
    paths,
    focusedId: resolveFocusedPathId(paths, focusedPathId),
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

/**
 * Every one of these paths, fetched and held together.
 *
 * The hero pager renders a page per hobby, and a page that only knows its
 * summary can show the goal but not the rep - so swiping produced a visible
 * flash: the incoming page appeared with its summary line, then the real
 * technique replaced it once focus settled. Fetching them all up front means
 * every page is complete before it is swiped to.
 *
 * Cheap to call repeatedly: the cache returns immediately for anything already
 * held or already in flight.
 */
export function usePathsFor(pathIds: readonly string[]): Record<string, LearningPath> {
  const { pathsById, ensurePath } = usePathCache();

  useEffect(() => {
    for (const pathId of pathIds) ensurePath(pathId);
  }, [pathIds, ensurePath]);

  return pathsById;
}
