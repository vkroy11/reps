import { ApiError } from '@reps/client';
import type { LearningPath, LearningPathSummary, Technique } from '@reps/core';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useApp } from '../../providers/app-provider';

function toApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError('UnexpectedResponse', (caught as Error).message);
}

interface PathCacheValue {
  summaries: LearningPathSummary[] | null;
  listError: ApiError | null;
  pathsById: Record<string, LearningPath>;
  errorsById: Record<string, ApiError>;
  /** Fetches a path unless it is already cached or in flight. */
  ensurePath: (pathId: string) => void;
  ensureList: () => void;
  refreshList: () => void;
  refreshPath: (pathId: string) => void;
  /**
   * Replaces a cached path after a mutation, and patches its summary so the
   * list agrees without a second request.
   */
  applyPath: (path: LearningPath) => void;
  /**
   * Replaces one technique inside its cached path, for mutations that answer
   * with a technique rather than a whole path.
   */
  applyTechnique: (technique: Technique) => void;
  /** Completions the board has already animated for this path, if any. */
  seenDone: (pathId: string) => number | null;
  markSeen: (pathId: string, doneCount: number) => void;
}

/** Exported so tests can supply the context without the fetching provider. */
export const PathCacheContext = createContext<PathCacheValue | null>(null);
export type { PathCacheValue };

/**
 * One cache for paths, shared by every screen.
 *
 * **Why this exists.** Each screen used to hold its own copy, fetched once on
 * mount. Tab screens stay mounted, so completing a technique left the Path tab
 * rendering the state from before - the learner was sent to a board that still
 * showed the old progress, and only an app restart fixed it. A per-screen
 * fetch cannot be invalidated by a mutation that happened on another screen.
 *
 * It also removes the refetch when swiping between skills: a path already
 * fetched is served from memory, so the hero does not flash a skeleton for
 * data the app is already holding.
 *
 * Deliberately small - no staleness policy, no background revalidation. Paths
 * only change through mutations this app performs, and every one of those
 * returns the updated path, so `applyPath` keeps the cache correct without
 * anything having to expire.
 */
export function PathCacheProvider({ children }: { children: ReactNode }) {
  const { api, ready } = useApp();

  const [summaries, setSummaries] = useState<LearningPathSummary[] | null>(null);
  const [listError, setListError] = useState<ApiError | null>(null);
  const [pathsById, setPathsById] = useState<Record<string, LearningPath>>({});
  const [errorsById, setErrorsById] = useState<Record<string, ApiError>>({});

  /*
    In-flight ids, in a ref rather than state.

    Two components mounting in the same commit both see an empty cache and both
    call ensurePath. A state flag would not have updated between them, so this
    has to be written synchronously to deduplicate the request.
  */
  const inFlight = useRef(new Set<string>());
  const listInFlight = useRef(false);
  /** Completions already animated, per path. Survives navigation. */
  const seen = useRef(new Map<string, number>());

  const fetchList = useCallback(
    (force: boolean) => {
      if (!ready || !api) return;
      if (listInFlight.current) return;
      /*
        A failure is terminal until the learner retries.

        `ensureList` runs from an effect whose dependency is this callback, and
        this callback changes whenever the cache does - so a request that both
        failed and cleared its own error would retry immediately, fail again,
        and hammer the API in a tight loop. An offline device is exactly the
        case where that must not happen. The screens all offer a retry, which
        arrives here as `force`.
      */
      if (!force && (summaries !== null || listError !== null)) return;

      listInFlight.current = true;
      setListError(null);

      api
        .listPaths()
        .then((result) => setSummaries(result))
        .catch((caught: unknown) => {
          setSummaries(null);
          setListError(toApiError(caught));
        })
        .finally(() => {
          listInFlight.current = false;
        });
    },
    [api, ready, summaries, listError],
  );

  const fetchPath = useCallback(
    (pathId: string, force: boolean) => {
      if (!ready || !api || !pathId) return;
      if (inFlight.current.has(pathId)) return;
      // Held, or already failed - see the note in fetchList about the loop.
      if (!force && (pathsById[pathId] || errorsById[pathId])) return;

      inFlight.current.add(pathId);
      setErrorsById((current) => {
        if (!current[pathId]) return current;

        const next = { ...current };
        delete next[pathId];

        return next;
      });

      api
        .getPath(pathId)
        .then((result) => {
          setPathsById((current) => ({ ...current, [result.id]: result }));
        })
        .catch((caught: unknown) => {
          setErrorsById((current) => ({ ...current, [pathId]: toApiError(caught) }));
        })
        .finally(() => {
          inFlight.current.delete(pathId);
        });
    },
    [api, ready, pathsById, errorsById],
  );

  const applyPath = useCallback((path: LearningPath) => {
    setPathsById((current) => ({ ...current, [path.id]: path }));

    // Patch the summary in place rather than refetching the list: everything a
    // summary holds is derivable from the path we were just handed.
    setSummaries((current) => {
      if (current === null) return current;

      const { techniques, ...rest } = path;
      const summary: LearningPathSummary = {
        ...rest,
        techniqueCount: techniques.length,
        completedCount: techniques.filter((item) => item.status === 'completed').length,
      };

      return current.some((item) => item.id === path.id)
        ? current.map((item) => (item.id === path.id ? summary : item))
        : [summary, ...current];
    });
  }, []);

  /*
    Resources are curated lazily, the first time a technique is opened, and
    that endpoint answers with the technique rather than the path. Without
    folding it back in, the videos existed on the technique screen and nowhere
    else - Today's "Saved for later" kept showing the path as it was before the
    lesson was found.
  */
  const applyTechnique = useCallback((technique: Technique) => {
    setPathsById((current) => {
      const path = current[technique.pathId];
      if (!path) return current;

      const techniques = path.techniques.map((candidate) =>
        candidate.id === technique.id ? technique : candidate,
      );
      // Identity is what the memoised readers key off, so an unchanged
      // technique must not produce a new path object.
      if (techniques.every((candidate, at) => candidate === path.techniques[at])) return current;

      return { ...current, [path.id]: { ...path, techniques } };
    });
  }, []);

  const value = useMemo<PathCacheValue>(
    () => ({
      summaries,
      listError,
      pathsById,
      errorsById,
      ensureList: () => fetchList(false),
      refreshList: () => fetchList(true),
      ensurePath: (pathId: string) => fetchPath(pathId, false),
      refreshPath: (pathId: string) => fetchPath(pathId, true),
      applyPath,
      applyTechnique,
      seenDone: (pathId: string) => seen.current.get(pathId) ?? null,
      markSeen: (pathId: string, doneCount: number) => seen.current.set(pathId, doneCount),
    }),
    [summaries, listError, pathsById, errorsById, fetchList, fetchPath, applyPath, applyTechnique],
  );

  return <PathCacheContext.Provider value={value}>{children}</PathCacheContext.Provider>;
}

export function usePathCache(): PathCacheValue {
  const value = useContext(PathCacheContext);
  if (!value) throw new Error('usePathCache must be used inside PathCacheProvider');

  return value;
}
