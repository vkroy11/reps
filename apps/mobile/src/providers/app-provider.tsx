import {
  createApiClient,
  createDraftStore,
  createFocusStore,
  emptyDraft,
  type ApiClient,
  type OnboardingDraft,
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
  /** The path the learner explicitly switched to, if any. */
  focusedPathId: string | null;
  /** Persisted, so the choice survives a restart and a switch is one tap. */
  focusPath: (pathId: string) => void;
  /** False until the persisted draft and device id have been read. */
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const draftStore = useMemo(() => createDraftStore(storage), []);
  const focusStore = useMemo(() => createFocusStore(storage), []);
  const [api, setApi] = useState<ApiClient | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(emptyDraft);
  const [focusedPathId, setFocusedPathId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Keyed by skill so switching skills refetches, but Q2 -> Q3 does not.
  const suggestionsCache = useRef(new Map<string, Promise<OnboardingSuggestions>>());

  useEffect(() => {
    let active = true;

    void (async () => {
      const [deviceId, storedDraft, storedFocus] = await Promise.all([
        getDeviceId(),
        draftStore.load(),
        focusStore.load(),
      ]);
      if (!active) return;

      setApi(createApiClient({ baseUrl: resolveApiBaseUrl(), deviceId }));
      setDraft(storedDraft);
      setFocusedPathId(storedFocus);
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [draftStore, focusStore]);

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
    () => ({ api, draft, patchDraft, clearDraft, loadSuggestions, focusedPathId, focusPath, ready }),
    [api, draft, patchDraft, clearDraft, loadSuggestions, focusedPathId, focusPath, ready],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');

  return value;
}
