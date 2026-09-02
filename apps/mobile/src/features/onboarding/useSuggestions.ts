import { ApiError } from '@reps/client';
import type { OnboardingSuggestions } from '@reps/core';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../providers/app-provider';

interface SuggestionsState {
  data: OnboardingSuggestions | null;
  error: ApiError | null;
  loading: boolean;
  retry: () => void;
}

/**
 * Skill-specific onboarding options.
 *
 * The provider caches by skill, so questions 2 and 3 share a single request -
 * the model is asked once and both screens read from the same answer.
 */
export function useSuggestions(skill: string | undefined): SuggestionsState {
  const { loadSuggestions, ready } = useApp();
  const [data, setData] = useState<OnboardingSuggestions | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !skill) return;

    let active = true;
    setError(null);

    loadSuggestions(skill)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setData(null);
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError('UnexpectedResponse', (caught as Error).message),
        );
      });

    return () => {
      active = false;
    };
  }, [skill, ready, loadSuggestions, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { data, error, loading: !data && !error, retry };
}
