import { ApiError } from '@reps/client';
import type { Technique, TechniqueContent } from '@reps/core';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../providers/app-provider';

function toApiError(caught: unknown): ApiError {
  return caught instanceof ApiError
    ? caught
    : new ApiError('UnexpectedResponse', (caught as Error).message);
}

interface TechniqueState {
  technique: Technique | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * One technique. The API curates its resources the first time it is opened, so
 * this can take a few seconds on a technique nobody has visited yet - which is
 * the point of curating lazily rather than for all eight upfront.
 */
export function useTechnique(techniqueId: string | null): TechniqueState {
  const { api, ready } = useApp();
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !api || !techniqueId) return;

    let active = true;
    setError(null);

    api
      .getTechnique(techniqueId)
      .then((result) => {
        if (active) setTechnique(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setTechnique(null);
        setError(toApiError(caught));
      });

    return () => {
      active = false;
    };
  }, [api, ready, techniqueId, attempt]);

  return {
    technique: technique?.id === techniqueId ? technique : null,
    error,
    loading: Boolean(techniqueId) && technique?.id !== techniqueId && error === null,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

interface ContentState {
  content: TechniqueContent | null;
  error: ApiError | null;
  loading: boolean;
  load: () => void;
}

/**
 * The generated drill, card deck or micro-lesson.
 *
 * On the technique page this is deliberately *not* fetched on mount:
 * generating it costs a model call, and it is only worth making when the
 * learner asks to practise. Once generated the API stores it, so a second
 * visit is instant.
 *
 * `eager` is for the session screen, where the decision has already been made
 * - somebody who tapped "start the rep" is going to need the instructions, and
 * waiting for a model call after they tap "step by step" mid-rep would read as
 * a broken panel.
 */
export function useTechniqueContent(
  techniqueId: string | null,
  options: { eager?: boolean } = {},
): ContentState {
  const { api, ready } = useApp();
  const [content, setContent] = useState<TechniqueContent | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [requested, setRequested] = useState(options.eager ? 1 : 0);

  useEffect(() => {
    if (!ready || !api || !techniqueId || requested === 0) return;

    let active = true;
    setError(null);

    api
      .getTechniqueContent(techniqueId)
      .then((result) => {
        if (active) setContent(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(toApiError(caught));
      });

    return () => {
      active = false;
    };
  }, [api, ready, techniqueId, requested]);

  return {
    content,
    error,
    loading: requested > 0 && content === null && error === null,
    load: useCallback(() => setRequested((value) => value + 1), []),
  };
}
