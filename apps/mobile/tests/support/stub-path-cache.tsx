import { PathCacheContext, type PathCacheValue } from '../../src/features/paths/path-cache';
import type { ReactNode } from 'react';

/**
 * The path cache context with no fetching behind it.
 *
 * Screen tests supply their own data by mocking `usePaths`, so all this has to
 * do is stop `usePathCache` throwing and record the calls a screen makes -
 * `applyPath` after a mutation, `markSeen` after the board animates.
 */
export const stubPathCache = {
  applyPath: jest.fn(),
  markSeen: jest.fn(),
  ensurePath: jest.fn(),
  ensureList: jest.fn(),
  refreshList: jest.fn(),
  refreshPath: jest.fn(),
  /** Overridable per test, so an unlock animation can be set up. */
  seenDone: jest.fn<number | null, [string]>(() => null),
};

export function resetStubPathCache() {
  stubPathCache.applyPath.mockClear();
  stubPathCache.markSeen.mockClear();
  stubPathCache.ensurePath.mockClear();
  stubPathCache.ensureList.mockClear();
  stubPathCache.refreshList.mockClear();
  stubPathCache.refreshPath.mockClear();
  stubPathCache.seenDone.mockReset();
  stubPathCache.seenDone.mockReturnValue(null);
}

export function StubPathCache({ children }: { children: ReactNode }) {
  const value: PathCacheValue = {
    summaries: null,
    listError: null,
    pathsById: {},
    errorsById: {},
    ...stubPathCache,
  };

  return <PathCacheContext.Provider value={value}>{children}</PathCacheContext.Provider>;
}
