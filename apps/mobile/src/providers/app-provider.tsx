import {
  createApiClient,
  createDraftStore,
  createFocusStore,
  createOnboardedStore,
  createSessionStore,
  emptyDraft,
  type ApiClient,
  type OnboardingDraft,
  type Session,
} from '@reps/client';
import type { OnboardingSuggestions } from '@reps/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { resolveApiBaseUrl } from '../lib/api-base-url';
import { getDeviceId } from '../lib/device-id';
import { storage } from '../lib/storage';

interface AppContextValue {
  api: ApiClient | null;
  draft: OnboardingDraft;
  /** Merges an answer and persists immediately - backgrounding loses nothing. */
  patchDraft: (patch: Partial<OnboardingDraft>) => void;
  clearDraft: () => Promise<void>;
  /** One request serves onboarding questions 2 and 3, so it is cached per skill. */
  loadSuggestions: (skill: string) => Promise<OnboardingSuggestions>;
  /**
   * Whether this device has ever finished the questionnaire, read from storage
   * before the first paint. This is what lets the app open on Today instead of
   * the welcome screen with no network round-trip and no flash of the wrong
   * screen.
   */
  onboarded: boolean;
  /** Called once a path exists, so the next cold start skips the welcome. */
  markOnboarded: () => void;
  /** Corrects the cached flag against the real path count once it arrives. */
  reconcileOnboarded: (pathCount: number) => void;
  /** The path the learner explicitly switched to, if any. */
  focusedPathId: string | null;
  /** Persisted, so the choice survives a restart and a switch is one tap. */
  focusPath: (pathId: string) => void;
  /** The signed-in account, or null while anonymous. */
  session: Session | null;
  signedIn: boolean;
  /** Stores a new session and makes every later request use it. */
  applySession: (session: Omit<Session, 'userId'> & { userId: string }) => Promise<void>;
  /** Unlinks this device. The account keeps everything on the server. */
  signOut: () => Promise<void>;
  /** False until the persisted draft and device id have been read. */
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const draftStore = useMemo(() => createDraftStore(storage), []);
  const focusStore = useMemo(() => createFocusStore(storage), []);
  const onboardedStore = useMemo(() => createOnboardedStore(storage), []);
  const sessionStore = useMemo(() => createSessionStore(storage), []);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  /*
    The token is read through a ref, not closed over.

    The API client is built once, with a getter. Rebuilding it on sign-in would
    hand every consumer a new object and refetch the whole app; a captured
    string would leave them all sending the previous token. A ref is the one
    shape that lets the client stay identical while what it sends changes.
  */
  const tokenRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(emptyDraft);
  const [focusedPathId, setFocusedPathId] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);

  // Keyed by skill so switching skills refetches, but Q2 -> Q3 does not.
  const suggestionsCache = useRef(new Map<string, Promise<OnboardingSuggestions>>());

  useEffect(() => {
    let active = true;

    void (async () => {
      const [deviceId, storedDraft, storedFocus, storedOnboarded, storedSession] =
        await Promise.all([
          getDeviceId(),
          draftStore.load(),
          focusStore.load(),
          onboardedStore.load(),
          sessionStore.load(),
        ]);
      if (!active) return;

      // Set before the client is built, so its very first request already
      // carries the token rather than one anonymous request slipping out.
      tokenRef.current = storedSession?.token ?? null;
      setSession(storedSession);
      setApi(
        createApiClient({
          baseUrl: resolveApiBaseUrl(),
          deviceId,
          getToken: () => tokenRef.current,
        }),
      );
      setDraft(storedDraft);
      setFocusedPathId(storedFocus);
      setOnboarded(storedOnboarded);
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [draftStore, focusStore, onboardedStore, sessionStore]);

  const patchDraft = useCallback(
    (patch: Partial<OnboardingDraft>) => {
      setDraft((current) => {
        const next = { ...current, ...patch };
        // Fire and forget: the in-memory value is the source of truth for the
        // render, and a failed write only costs a resumed draft.
        void draftStore.save(next);

        return next;
      });
    },
    [draftStore],
  );

  const clearDraft = useCallback(async () => {
    suggestionsCache.current.clear();
    setDraft(emptyDraft);
    await draftStore.clear();
  }, [draftStore]);

  const markOnboarded = useCallback(() => {
    setOnboarded(true);
    void onboardedStore.save(true);
  }, [onboardedStore]);

  const reconcileOnboarded = useCallback(
    (pathCount: number) => {
      setOnboarded((current) => {
        void onboardedStore.reconcile(current, pathCount);

        return pathCount > 0;
      });
    },
    [onboardedStore],
  );

  const applySession = useCallback(
    async (next: Session) => {
      tokenRef.current = next.token;
      setSession(next);
      await sessionStore.save(next);
      // Signing in can only add paths, never remove them, so the landing flag
      // is set rather than reconciled.
      markOnboarded();
    },
    [sessionStore, markOnboarded],
  );

  const signOut = useCallback(async () => {
    // Told to the server first: it is what repoints this device at a fresh
    // identity. Clearing locally first would leave no token to authorise the
    // call, and the device would stay linked to the account forever.
    try {
      await api?.signOut();
    } finally {
      tokenRef.current = null;
      setSession(null);
      await sessionStore.clear();
      /*
        The device now speaks for an empty learner, so it goes back to the
        welcome screen. Written *and* set: saving alone only takes effect on
        the next cold start, so until then the landing route kept redirecting
        to a Today with nothing on it.
      */
      setOnboarded(false);
      await onboardedStore.save(false);
    }
  }, [api, sessionStore, onboardedStore]);

  const focusPath = useCallback(
    (pathId: string) => {
      setFocusedPathId(pathId);
      void focusStore.save(pathId);
    },
    [focusStore],
  );

  const loadSuggestions = useCallback(
    (skill: string) => {
      const key = skill.trim().toLowerCase();
      const cached = suggestionsCache.current.get(key);
      if (cached) return cached;

      if (!api) return Promise.reject(new Error('API client is not ready yet'));

      const pending = api.suggestions(skill).catch((error: unknown) => {
        // Do not cache a failure, otherwise Retry would be a no-op.
        suggestionsCache.current.delete(key);
        throw error;
      });
      suggestionsCache.current.set(key, pending);

      return pending;
    },
    [api],
  );

  const value = useMemo(
    () => ({
      api,
      draft,
      patchDraft,
      clearDraft,
      loadSuggestions,
      onboarded,
      markOnboarded,
      reconcileOnboarded,
      focusedPathId,
      focusPath,
      session,
      signedIn: session !== null,
      applySession,
      signOut,
      ready,
    }),
    [
      api,
      draft,
      patchDraft,
      clearDraft,
      loadSuggestions,
      onboarded,
      markOnboarded,
      reconcileOnboarded,
      focusedPathId,
      focusPath,
      session,
      applySession,
      signOut,
      ready,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');

  return value;
}
