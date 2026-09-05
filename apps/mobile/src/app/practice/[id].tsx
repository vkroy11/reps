import { ApiError } from '@reps/client';
import type { Confidence, ReflectResult } from '@reps/core';
import { Card, PipMascot, Skeleton, Text, color, radius, space } from '@reps/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackIcon } from '../../components/icons';
import { LevelUpCelebration } from '../../features/practice/LevelUpCelebration';
import { FlashcardDrill } from '../../features/practice/FlashcardDrill';
import { PracticeTimer } from '../../features/practice/PracticeTimer';
import { ReflectStep } from '../../features/practice/ReflectStep';
import { SessionInstructions } from '../../features/practice/SessionInstructions';
import { usePathCache } from '../../features/paths/path-cache';
import { useTechnique, useTechniqueContent } from '../../features/techniques/useTechnique';
import { useApp } from '../../providers/app-provider';

type Stage = 'timing' | 'reflecting' | 'celebrating';

/**
 * One rep, start to finish: the timer, then the reflection, then whatever it
 * earned.
 *
 * A separate route from the technique screen on purpose. The technique screen
 * is reference material you can browse; this is a session you are inside, and
 * giving it its own entry in the stack means backing out of a rep does not
 * dump you out of the technique too.
 */
export default function PracticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useApp();
  const { applyPath } = usePathCache();
  const { technique, loading } = useTechnique(id ?? null);
  /*
    The written instructions, fetched alongside the technique rather than on
    demand: generation takes a model call, and asking for it only when the
    learner taps "step by step" would make the panel feel broken mid-rep.
  */
  const { content, loading: contentLoading } = useTechniqueContent(id ?? null, { eager: true });

  const [stage, setStage] = useState<Stage>('timing');
  const [minutes, setMinutes] = useState(0);
  const [result, setResult] = useState<ReflectResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const reflect = async (confidence: Confidence) => {
    if (!api || !id || saving) return;

    setSaving(true);
    setError(null);
    try {
      const reflected = await api.reflect(id, { confidence, practiceMinutes: minutes });
      setResult(reflected);

      /*
        Into the shared cache immediately, before any navigation.

        This is the fix for the board showing pre-completion state: the Path
        tab stays mounted, so it will never refetch on its own. Handing it the
        path we were just given also means the unlock animation has something
        to animate *to*, while the cache still remembers what was last shown.
      */
      applyPath(reflected.path);

      // Only a completion is worth a celebration. "Getting there" and
      // "struggling" go straight back, because nothing was unlocked and
      // confetti over an unfinished technique would be a lie.
      if (confidence === 'solid') setStage('celebrating');
      else router.back();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError('UnexpectedResponse', (caught as Error).message),
      );
    } finally {
      setSaving(false);
    }
  };

  const done = result?.path.techniques.filter((item) => item.status === 'completed').length ?? 0;
  const next = result?.path.techniques.find((item) => item.status === 'active') ?? null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave this session"
          onPress={() => router.back()}
          style={styles.back}
        >
          <BackIcon />
        </Pressable>
        <Text variant="heading" numberOfLines={1} style={styles.headerTitle}>
          {technique?.title ?? 'Practice'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
      >
        {loading ? (
          <View style={styles.loading}>
            <Skeleton height={208} width={208} borderRadius={104} />
            <Skeleton height={18} width="60%" delay={80} />
          </View>
        ) : null}

        {technique && stage === 'timing' ? (
          <>
            {/* The rep itself stays on screen while the timer runs - the
                learner should not have to remember what they are doing. */}
            <Card tone="progress" style={styles.rep}>
              <Text variant="overline" tone="progressText">
                The rep
              </Text>
              <Text variant="body" tone="progressText" style={styles.repText}>
                {technique.practicePrompt}
              </Text>
            </Card>

            {/*
              A recall technique gets the deck itself, not a list of its cards.
              Everything else gets the written instructions collapsed above the
              timer - a drill is performed away from the phone, a deck is not.
            */}
            {content?.format === 'flashcards' ? (
              <FlashcardDrill content={content} onFinished={() => undefined} />
            ) : (
              <SessionInstructions content={content} loading={contentLoading} />
            )}

            <PracticeTimer
              targetMinutes={technique.estimatedMinutes}
              onDone={(practised) => {
                setMinutes(practised);
                setStage('reflecting');
              }}
            />
          </>
        ) : null}

        {technique && stage === 'reflecting' ? (
          <>
            <ReflectStep minutes={minutes} onReflect={reflect} saving={saving} />

            {error ? (
              <Card style={styles.error}>
                <View style={styles.errorHead}>
                  <PipMascot size={40} expression="struggle" />
                  <Text variant="heading" style={styles.errorTitle}>
                    Couldn’t save that
                  </Text>
                </View>
                <Text variant="caption" tone="textSecondary">
                  {error.code === 'NetworkError'
                    ? 'You’re offline. Your practice is not lost — try again when you have a connection.'
                    : error.message}
                </Text>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {stage === 'celebrating' && result && technique ? (
        <LevelUpCelebration
          techniqueTitle={technique.title}
          xpGained={result.awarded.xp}
          minutes={result.awarded.minutes}
          done={done}
          total={result.path.techniques.length}
          badge={result.awarded.badge}
          nextTitle={next?.title ?? null}
          onContinue={() => {
            // Pops this session (and the technique screen, if it was opened
            // from there) back to the tabs, then lands on the board - where the
            // trail is about to travel to the node this just unlocked.
            router.dismissAll();
            router.replace('/(tabs)/path');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.base,
    paddingBottom: space.sm,
  },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0 },
  content: {
    paddingHorizontal: space.base,
    paddingTop: space.base,
    gap: space.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  loading: { alignItems: 'center', gap: space.base },
  rep: { gap: space.xs },
  repText: { fontSize: 15, lineHeight: 21 },
  error: { gap: space.sm, marginTop: space.base, borderRadius: radius.card },
  errorHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  errorTitle: { flex: 1, minWidth: 0 },
});
