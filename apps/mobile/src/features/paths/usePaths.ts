import { ApiError, resolveFocusedPathId } from '@reps/client';
import type { LearningPath, LearningPathSummary } from '@reps/core';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../providers/app-provider';

function toApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError('UnexpectedResponse', (caught as Error).message);
}

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
 */
export function usePathList(): PathListState {
  const { api, ready, focusedPathId } = useApp();
  const [paths, setPaths] = useState<LearningPathSummary[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !api) return;

    let active = true;
    setError(null);

    api
      .listPaths()
      .then((result) => {
        if (active) setPaths(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setPaths(null);
        setError(toApiError(caught));
      });

    return () => {
      active = false;
    };
  }, [api, ready, attempt]);

  return {
    paths: paths ?? [],
    focusedId: resolveFocusedPathId(paths ?? [], focusedPathId),
    error,
    loading: paths === null && error === null,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

interface PathState {
  path: LearningPath | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** One path with its techniques and resources. */
export function usePath(pathId: string | null): PathState {
  const { api, ready } = useApp();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !api || !pathId) return;

    let active = true;
    setError(null);

    api
      .getPath(pathId)
      .then((result) => {
        if (active) setPath(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setPath(null);
        setError(toApiError(caught));
      });

    return () => {
      active = false;
    };
  }, [api, ready, pathId, attempt]);

  return {
    // Keep the previous path visible while a switch loads, rather than flashing empty.
    path: path && path.id === pathId ? path : null,
    error,
    loading: Boolean(pathId) && path?.id !== pathId && error === null,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
