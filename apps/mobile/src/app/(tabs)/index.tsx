import { pathProgress } from '@reps/client';
import type { LearningPathSummary, Technique } from '@reps/core';
import {
  Button,
  Card,
  PipLogo,
  ProgressBar,
  Skeleton,
  Text,
  color,
  space,
  useBreakpoint,
} from '@reps/ui';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StreakChip } from '../../features/paths/StreakChip';
import { usePath, usePathList } from '../../features/paths/usePaths';
import { usePracticeHistory, useWeek } from '../../features/progress/useStreak';
import { HeroPager, nextGateLine } from '../../features/today/HeroPager';
import { SessionPlan } from '../../features/today/SessionPlan';
import { WeekStrip } from '../../features/today/WeekStrip';
import { useApp } from '../../providers/app-provider';

/**
 * Today is the session, not the path.
 *
 * The Path tab already draws every technique, so listing them again here would
 * be two views of one thing. This screen carries what the map cannot: the rep
 * to perform, how the week is going, and one button to begin.
 *
 * Every block on it is backed by stored data. The heatmap, quick-recall card
 * and saved shelf from the design are not here yet because the data behind them
 * is not - a block appears when its source does, rather than sitting empty.
 */
export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const { focusPath, reconcileOnboarded } = useApp();
  const { paths, focusedId, loading: listLoading, error: listError, reload } = usePathList();
  const { path } = usePath(focusedId);
  const { entries, streak } = usePracticeHistory();

  const focusedSummary = paths.find((item) => item.id === focusedId) ?? null;
  const week = useWeek(
    entries,
    focusedSummary?.dailyMinutes ?? 20,
    focusedSummary?.daysPerWeek ?? 5,
  );

  /*
    The one place that knows the real path count, so it is where the cached
    landing flag gets corrected. Without this, a device whose paths were
    deleted server-side would keep skipping the welcome screen forever and land
    on an empty Today.
  */
  useEffect(() => {
    if (!listLoading && !listError) reconcileOnboarded(paths.length);
  }, [listLoading, listError, paths.length, reconcileOnboarded]);

  const focusedIndex = Math.max(
    paths.findIndex((item) => item.id === focusedId),
    0,
  );
  const active = path?.techniques.find((technique) => technique.status === 'active') ?? null;

  return (
    <View style={styles.screen}>
      {/* One number in the HUD, on the right, and nothing else competing with it. */}
      <View
        style={[
          isWide ? styles.hudWide : styles.hud,
          { paddingTop: insets.top + space.sm },
        ]}
      >
        <PipLogo size={32} />
        <Text variant="heading" style={styles.brand}>
          Reps
        </Text>
        <View style={styles.spacer} />
        <StreakChip days={streak.current} />
      </View>

      <ScrollView
        contentContainerStyle={[
          isWide ? styles.contentWide : styles.content,
          { paddingBottom: insets.bottom + space.xl },
        ]}
      >
        {listLoading ? (
          <>
            <Skeleton height={62} />
            <Skeleton height={210} delay={80} />
          </>
        ) : null}

        {listError ? (
          <Card>
            <Text variant="heading">Can’t reach Reps</Text>
            <Text variant="body" tone="textSecondary" style={styles.gap}>
              {listError.code === 'NetworkError'
                ? 'Check that the API is running and you’re on the same network.'
                : listError.message}
            </Text>
            <Button label="Try again" variant="secondary" onPress={reload} />
          </Card>
        ) : null}

        {!listLoading && !listError && paths.length === 0 ? (
          <View style={styles.empty}>
            <PipLogo size={88} />
            <Text variant="heading" center>
              Nothing on today
            </Text>
            <Text variant="body" tone="textSecondary" center>
              Pick a hobby and Reps builds a short path of 5–8 techniques.
            </Text>
            <Button
              label="Start a hobby"
              onPress={() => router.push('/onboarding/skill')}
              testID="start-hobby"
            />
          </View>
        ) : null}

        {paths.length > 0 ? (
          /*
            Wide puts the week beside the hero rather than above it. Stacked,
            the CTA is pushed below the fold on a short desktop window - and
            the week is context for the decision, not something to scroll past
            on the way to it.
          */
          <View style={isWide ? styles.columns : undefined}>
            <View style={isWide ? styles.sideColumn : undefined}>
              <WeekStrip week={week} />
              <Text variant="caption" tone="textSecondary" center style={styles.weekLine}>
                {streak.current === 0
                  ? 'No streak yet. One session starts it.'
                  : streak.practisedToday
                    ? `${streak.current} day streak — today is in.`
                    : `${streak.current} day streak. Practise today to keep it.`}
              </Text>
            </View>

            <View style={isWide ? styles.mainColumn : undefined}>
              <HeroPager
                paths={paths}
                initialIndex={focusedIndex}
                onFocus={focusPath}
                onAddPath={() => router.push('/onboarding/skill')}
                renderPage={(summary) => (
                  <HeroPage
                    summary={summary}
                    active={summary.id === focusedId ? active : null}
                    onStart={(techniqueId) => router.push(`/practice/${techniqueId}`)}
                    onOpen={(techniqueId) => router.push(`/technique/${techniqueId}`)}
                  />
                )}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * One path's page: what it is, where you are in it, and the next rep.
 *
 * The active technique is only supplied for the focused path - the others show
 * their progress without a CTA, because starting a rep on a path you have only
 * swiped past would be starting it by accident.
 */
function HeroPage({
  summary,
  active,
  onStart,
  onOpen,
}: {
  summary: LearningPathSummary;
  active: Technique | null;
  onStart: (techniqueId: string) => void;
  onOpen: (techniqueId: string) => void;
}) {
  const progress = pathProgress(summary);
  const gate = nextGateLine(summary);
  const finished = summary.completedCount >= summary.techniqueCount;

  return (
    <Card style={styles.hero}>
      {/* Skill above the bar, count beside it: a sentence-length skill name
          would otherwise shove the count off the row. */}
      <Text variant="label" numberOfLines={2}>
        {summary.skill}
      </Text>
      <View style={styles.progressRow}>
        <ProgressBar value={progress} tone="progress" />
        <Text variant="caption" tone="textSecondary" style={styles.count}>
          {summary.completedCount} of {summary.techniqueCount}
        </Text>
      </View>
      <Text variant="caption" tone="textSecondary" numberOfLines={2} style={styles.goal}>
        {summary.goal}
      </Text>

      {finished ? (
        <View style={styles.finished}>
          <Text variant="heading">Path complete</Text>
          <Text variant="caption" tone="textSecondary">
            You did the thing you came here for.
          </Text>
        </View>
      ) : active ? (
        <>
          <Text variant="overline" tone="textSecondary" style={styles.kicker}>
            Next up · level {active.order + 1}
          </Text>
          <Text variant="title" numberOfLines={2} style={styles.title}>
            {active.title}
          </Text>
          <Text variant="caption" tone="textSecondary" style={styles.meta}>
            {active.estimatedMinutes} min · {active.modality.replace(/_/g, ' ')}
          </Text>

          <SessionPlan
            modality={active.modality}
            preferredFormats={summary.preferredFormats}
            totalMinutes={active.estimatedMinutes}
          />

          {/* Why this rep matters, phrased against the learner's own goal. */}
          <View style={styles.payoff}>
            <Text variant="caption" tone="progressText">
              {active.whyItMatters}
            </Text>
          </View>

          <Button
            label="Start the rep"
            onPress={() => onStart(active.id)}
            style={styles.cta}
            testID="start-rep"
          />
          <Button
            label="See the details first"
            variant="ghost"
            onPress={() => onOpen(active.id)}
          />
        </>
      ) : (
        <Text variant="caption" tone="textSecondary" style={styles.kicker}>
          Swipe to this hobby to pick it up.
        </Text>
      )}

      {gate ? (
        <Text variant="caption" tone="textSecondary" center style={styles.gate}>
          {gate}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.base,
    paddingBottom: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hudWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  brand: { letterSpacing: -0.3 },
  spacer: { flex: 1 },
  content: {
    paddingHorizontal: space.base,
    gap: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  contentWide: {
    paddingHorizontal: space.lg,
    gap: space.sm,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  columns: { flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' },
  sideColumn: { width: 300, flexShrink: 0 },
  mainColumn: { flex: 1, minWidth: 0 },
  gap: { marginTop: space.sm },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
  weekLine: { marginBottom: space.sm },
  hero: { gap: space.xs },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  count: { flexShrink: 0 },
  goal: { marginTop: space.xs },
  kicker: { marginTop: space.base },
  title: { marginTop: space.xs },
  meta: { marginBottom: space.md },
  payoff: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: 12,
    backgroundColor: color.progressSoft,
  },
  cta: { marginTop: space.base },
  finished: { marginTop: space.base, gap: space.xs },
  gate: { marginTop: space.md },
});
