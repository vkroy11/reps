import { ApiError, toOnboardingInput } from '@reps/client';
import type { LearningPath } from '@reps/core';
import { Button, Card, PipMascot, ProgressBar, Text, color, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StageList, type Stage, type StageState } from '../features/onboarding/StageList';
import { useApp } from '../providers/app-provider';

const STAGE_LABELS = ['Planning techniques', 'Finding resources', 'Picking the best ones'] as const;

/**
 * Observed stage durations from the real pipeline, used to decide which stage
 * to highlight. The endpoint is a single POST rather than a stream, so *which*
 * stage is showing is an estimate - but it never claims a stage finished when
 * the request is still running, and it never rewinds.
 */
const STAGE_SECONDS = [6, 9, 5];
const TOTAL_SECONDS = STAGE_SECONDS.reduce((sum, seconds) => sum + seconds, 0);
/** Creep to this and wait; only a real response completes the bar. */
const CREEP_CEILING = 0.92;

export default function GeneratingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, api, focusPath, clearDraft } = useApp();

  const [elapsed, setElapsed] = useState(0);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [running, setRunning] = useState(false);
  const startedRef = useRef(false);

  const input = toOnboardingInput(draft);

  const build = useCallback(async () => {
    if (!api || !input) return;

    setRunning(true);
    setError(null);
    setElapsed(0);
    try {
      const created = await api.createPath(input);
      setPath(created);
      // The new path becomes the focus, and the draft has served its purpose.
      focusPath(created.id);
      void clearDraft();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError('UnexpectedResponse', (caught as Error).message),
      );
    } finally {
      setRunning(false);
    }
  }, [api, input, focusPath, clearDraft]);

  // Kick off automatically: arriving here is the learner asking for a path.
  useEffect(() => {
    if (startedRef.current || !api || !input) return;
    startedRef.current = true;
    void build();
  }, [api, input, build]);

  // Drives stage highlighting only. Animations run on the UI thread; this is a
  // 4Hz tick updating a couple of labels, not an animation loop.
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => setElapsed((value) => value + 0.25), 250);

    return () => clearInterval(timer);
  }, [running]);

  const stages = buildStages({ elapsed, running, done: Boolean(path), failed: Boolean(error) });
  const progress = path ? 1 : Math.min((elapsed / TOTAL_SECONDS) * CREEP_CEILING, CREEP_CEILING);

  const expression = error ? 'struggle' : path ? 'cheer' : 'think';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl },
      ]}
    >
      <View style={styles.hero}>
        <PipMascot size={124} expression={expression} progress={progress} testID="mascot" />
        <Text variant="title" center>
          {path
            ? 'Your path is ready'
            : error
              ? 'That didn’t come back'
              : `Building your ${draft.skill ?? 'path'}`}
        </Text>
        {!path && !error ? (
          <Text variant="body" tone="textSecondary" center>
            {draft.goal}
          </Text>
        ) : null}
      </View>

      {!path ? (
        <>
          <StageList stages={stages} />
          <View style={styles.bar}>
            <ProgressBar value={progress} tone="brand" />
          </View>
          {!error ? (
            <Text variant="caption" tone="textSecondary" center>
              About {TOTAL_SECONDS} seconds. Worth it.
            </Text>
          ) : null}
        </>
      ) : null}

      {error ? (
        <Card>
          <Text variant="body">{describe(error)}</Text>
          <View style={styles.actions}>
            <Button label="Try again" onPress={build} testID="retry" />
            {error.isDegradable ? (
              <Text variant="caption" tone="textSecondary" center>
                Your plan can still be built without videos.
              </Text>
            ) : null}
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          </View>
        </Card>
      ) : null}

      {path ? (
        <>
          <Card>
            <Text variant="overline" tone="textSecondary">
              {path.techniques.length} techniques · {path.archetype}
            </Text>
            {path.techniques.map((technique) => (
              <View key={technique.id} style={styles.technique}>
                <Text variant="label">
                  {technique.order + 1}. {technique.title}
                </Text>
                <Text variant="caption" tone="textSecondary">
                  {technique.modality.replace(/_/g, ' ')} · {technique.estimatedMinutes} min ·{' '}
                  {technique.resources.length} resource(s)
                </Text>
              </View>
            ))}
          </Card>
          <Button
            label="Start practising"
            onPress={() => router.replace('/(tabs)')}
            testID="go-to-today"
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function buildStages({
  elapsed,
  running,
  done,
  failed,
}: {
  elapsed: number;
  running: boolean;
  done: boolean;
  failed: boolean;
}): Stage[] {
  let boundary = 0;
  const activeIndex = STAGE_SECONDS.findIndex((seconds) => {
    boundary += seconds;

    return elapsed < boundary;
  });
  // Past the estimate the last stage stays active rather than claiming done.
  const current = activeIndex === -1 ? STAGE_SECONDS.length - 1 : activeIndex;

  return STAGE_LABELS.map((label, index): Stage => {
    let state: StageState;

    if (done) state = 'done';
    else if (failed) state = index < current ? 'done' : index === current ? 'failed' : 'pending';
    else if (!running) state = 'pending';
    else if (index < current) state = 'done';
    else if (index === current) state = 'active';
    else state = 'pending';

    return { label, state };
  });
}

function describe(error: ApiError): string {
  switch (error.code) {
    case 'NetworkError':
      return 'We couldn’t reach Reps. Check that the API is running and you’re on the same network.';
    case 'RateLimited':
      return `The model is busy. ${error.retryAfterSeconds ? `Try again in about ${error.retryAfterSeconds}s.` : 'Give it a moment.'}`;
    case 'QuotaExhausted':
      return 'Today’s quota for finding videos is spent.';
    case 'ProviderInvalidOutput':
      return 'The model returned something we couldn’t use.';
    default:
      return error.message;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  content: {
    paddingHorizontal: space.base,
    gap: space.base,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: space.md, marginBottom: space.sm },
  bar: { flexDirection: 'row' },
  actions: { gap: space.sm, marginTop: space.md },
  technique: { marginTop: space.md, gap: 2 },
});
