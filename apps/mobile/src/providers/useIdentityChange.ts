import { useEffect, useRef } from 'react';
import { useApp } from './app-provider';

/**
 * Runs when the learner this device speaks for changes.
 *
 * Signing in and signing out both swap the identity behind every request while
 * the API client object deliberately stays the same - it holds a token getter
 * rather than a token, so consumers are not handed a new client and made to
 * refetch the world on every session change. The cost of that choice is that
 * nothing downstream notices on its own: a cache that has already loaded the
 * anonymous device's data keeps serving it, and signing in appears to do
 * nothing at all.
 *
 * `handler` must be stable - wrap it in useCallback.
 */
export function useOnIdentityChange(handler: () => void): void {
  const { session, ready } = useApp();
  const identity = session?.userId ?? null;
  /* undefined means "not yet observed", which is different from signed out. */
  const seen = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Storage is still being read, so the absence of a session means nothing.
    if (!ready) return;

    if (seen.current === undefined) {
      seen.current = identity;

      return;
    }

    if (seen.current === identity) return;

    seen.current = identity;
    handler();
  }, [ready, identity, handler]);
}
