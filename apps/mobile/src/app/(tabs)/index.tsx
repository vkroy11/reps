import {
  entriesOn,
  heatmap,
  masteryOf,
  resumePoints,
  today,
  toLocalDay,
  weekStats,
  type LocalDay,
  type NoteWithContext,
  type ResumePoint,
} from '@reps/core';
import { Button, Card, GradientPanel, PipLogo, Text, color, space, useBreakpoint } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotebook } from '../../features/notes/useNotes';
import { usePath, usePathList, usePathsFor } from '../../features/paths/usePaths';
import { usePracticeHistory, useWeek } from '../../features/progress/useStreak';
import { DayPanel } from '../../features/today/DayPanel';
import { HeroPage } from '../../features/today/HeroPage';
import { HeroPager } from '../../features/today/HeroPager';
import { InsightTiles } from '../../features/today/InsightTiles';
import { NextGateCard } from '../../features/today/NextGateCard';
import { PracticeHeatmap, weeksThatFit } from '../../features/today/PracticeHeatmap';
import { ResumeRows } from '../../features/today/ResumeRows';
import { SaidShelf } from '../../features/today/SaidShelf';
import { SavedShelf, savedItems } from '../../features/today/SavedShelf';
import { Section } from '../../features/today/Section';
import { TodayHeader, todayLabel } from '../../features/today/TodayHeader';
import {
  HeatmapSkeleton,
  HeroSkeleton,
  InsightTilesSkeleton,
  NextGateSkeleton,
  SavedShelfSkeleton,
} from '../../features/today/TodaySkeletons';
import { WeekChart } from '../../features/today/WeekChart';
import { WeekStrip } from '../../features/today/WeekStrip';
import { useApp } from '../../providers/app-provider';

/** Two of each shelf. More and the home screen becomes an archive. */
const SAID_LIMIT = 2;
const SAVED_LIMIT = 6;
const RESUME_LIMIT = 3;

/** The page's own width ceiling, so the gradient never spans a monitor. */
const PHONE_MAX = 640;
const WIDE_MAX = 1080;
/** Width of the right-hand pane on a wide layout. */
const SIDE_COLUMN = 320;

/**
 * Today is the session, not the path.
 *
 * The Path tab already draws every technique, so listing them again here would
 * be two views of one thing. This screen carries what the map cannot: the rep
 * to perform, how the week is going, what the learner said last time, and one
 * button to begin.
 *
 * **Reading order.** The gradient panel at the top holds the decision - one
 * hobby per page, swipe for another. Everything under it is evidence for that
 * decision, in cards on the page, and the panel's soft skirt is what separates
 * "act" from "read". Every block below is backed by stored data, and a block
 * with no data behind it does not render at all rather than sitting empty.
 */
export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const { width } = useWindowDimensions();
  const { focusPath, reconcileOnboarded } = useApp();

  const { paths, focusedId, loading: listLoading, error: listError, reload } = usePathList();
  const { path, loading: pathLoading } = usePath(focusedId);
  const { entries, streak, loading: historyLoading } = usePracticeHistory();
  // Every hobby, not just the one in focus: the pager renders a page each.
  const pathIds = useMemo(() => paths.map((item) => item.id), [paths]);
  const pathsById = usePathsFor(pathIds);
  const { notes } = useNotebook();
  const [openDay, setOpenDay] = useState<LocalDay | null>(null);

  const focusedSummary = paths.find((item) => item.id === focusedId) ?? null;
  const dailyMinutes = focusedSummary?.dailyMinutes ?? 20;
  const daysPerWeek = focusedSummary?.daysPerWeek ?? 5;
  const week = useWeek(entries, dailyMinutes, daysPerWeek);

  /*
    The one place that knows the real path count, so it is where the cached
    landing flag gets corrected. Without this, a device whose paths were
    deleted server-side would keep skipping the welcome screen forever and land
    on an empty Today.
  */
  useEffect(() => {
    if (!listLoading && !listError) reconcileOnboarded(paths.length);
  }, [listLoading, listError, paths.length, reconcileOnboarded]);

  const contentWidth = Math.min(width, isWide ? WIDE_MAX : PHONE_MAX);
  /*
    On a phone the panel bleeds to the screen edges, so a page is the whole
    panel. On a wide layout it sits in the main column, so a page is that
    column - which keeps the hero and the panels beneath it on one left edge.
  */
  const pageWidth = isWide
    ? contentWidth - SIDE_COLUMN - space.xl - space.lg * 2
    : Math.min(width, PHONE_MAX);

  const stats = useMemo(() => weekStats(week, entries, daysPerWeek), [week, entries, daysPerWeek]);

  const grid = useMemo(() => {
    // A card's inner width: the column, minus its gutter, minus card padding.
    const column = isWide ? SIDE_COLUMN : contentWidth;
    const available = column - space.base * 2 - space.base * 2;

    return heatmap(entries, today(), {
      weeks: weeksThatFit(available),
      dailyMinutes,
    });
  }, [entries, isWide, contentWidth, dailyMinutes]);

  const dayEntries = useMemo(
    () => (openDay === null ? [] : entriesOn(entries, openDay)),
    [entries, openDay],
  );
  const dayNotes = useMemo(
    () =>
      openDay === null
        ? []
        : notes.filter((item) => {
            const at = new Date(item.createdAt);

            return !Number.isNaN(at.getTime()) && toLocalDay(at) === openDay;
          }),
    [notes, openDay],
  );

  const said = useMemo(() => notes.slice(0, SAID_LIMIT), [notes]);
  const resume = useMemo(() => resumePoints(notes, RESUME_LIMIT), [notes]);
  const saved = useMemo(() => (path ? savedItems(path, SAVED_LIMIT) : []), [path]);

  const focusedIndex = Math.max(
    paths.findIndex((item) => item.id === focusedId),
    0,
  );
  const active = path?.techniques.find((technique) => technique.status === 'active') ?? null;

  const openNote = (note: NoteWithContext) =>
    router.push({
      pathname: '/technique/[id]',
      params: {
        id: note.techniqueId,
        ...(note.timestampSec === null ? {} : { seek: String(note.timestampSec) }),
      },
    });

  const openResume = (point: ResumePoint) =>
    router.push({
      pathname: '/technique/[id]',
      params: { id: point.techniqueId, seek: String(point.atSec) },
    });

  if (!listLoading && !listError && paths.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={[styles.empty, { paddingTop: insets.top + space.xxl }]}>
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
      </View>
    );
  }

  /*
    The hero, and the panels that describe the hobby in focus.

    These are the only parts a swipe changes, which is why they carry their own
    skeletons: the header, the strip and the week chart are the same whichever
    hobby is showing, and replacing them too would make a swipe look like a
    cold start.
  */
  const hero =
    listLoading || !focusedSummary ? (
      <HeroSkeleton />
    ) : (
      <HeroPager
        paths={paths}
        initialIndex={focusedIndex}
        onFocus={focusPath}
        onAddPath={() => router.push('/onboarding/skill')}
        pageWidth={pageWidth}
        /*
          Each page is drawn from its own path, so a hobby swiped to is already
          complete rather than filling in after focus settles.
        */
        renderPage={(summary) => {
          const own = pathsById[summary.id] ?? null;
          if (!own) return <HeroSkeleton />;

          return (
            <HeroPage
              summary={summary}
              active={own.techniques.find((technique) => technique.status === 'active') ?? null}
              streak={streak}
              onStart={(techniqueId) => router.push(`/practice/${techniqueId}`)}
              onOpen={(techniqueId) => router.push(`/technique/${techniqueId}`)}
              testID={`hero-page-${summary.id}`}
            />
          );
        }}
      />
    );

  const aboutTheHobby = (
    <>
      <Section title="My practice today" bleed>
        {pathLoading || !path ? (
          <InsightTilesSkeleton />
        ) : (
          <InsightTiles
            mastery={active ? masteryOf(active) : 1}
            streak={streak.current}
            longestStreak={streak.longest}
            xp={path.xp}
            onLogPractice={() => active && router.push(`/practice/${active.id}`)}
            onOpenTechnique={() => active && router.push(`/technique/${active.id}`)}
            onOpenProfile={() => router.push('/(tabs)/me')}
          />
        )}
      </Section>

      <Section title="Next gate">
        {pathLoading || !path ? (
          <NextGateSkeleton />
        ) : (
          <NextGateCard path={path} onOpenPath={() => router.push('/(tabs)/path')} />
        )}
      </Section>
    </>
  );

  const aboutTheWeek = (
    <>
      <Section title="Last 7 days" meta={`${stats.totalMinutes} min total`}>
        <WeekChart week={week} stats={stats} dailyMinutes={dailyMinutes} />
      </Section>

      <Section
        title="The whole path"
        meta={
          historyLoading
            ? null
            : `${grid.weeks} weeks · ${grid.sessions} ${grid.sessions === 1 ? 'session' : 'sessions'}`
        }
      >
        {/*
          Absent until there is a history to draw, rather than showing a grid
          of empty squares to somebody on their first day - that reads as a
          wall of missed days they never had a chance to fill.
        */}
        {historyLoading ? (
          <HeatmapSkeleton />
        ) : entries.length === 0 ? null : (
          <PracticeHeatmap grid={grid} />
        )}
      </Section>
    </>
  );

  const gradientHero = (
    <GradientPanel
      from={color.brandSoft}
      to={color.surfacePage}
      bottomRadius={34}
      style={[styles.gradient, { maxWidth: pageWidth }]}
    >
      {hero}
    </GradientPanel>
  );

  const aboutTheWork = (
    <>
      {/* Notes and resume rows belong to the learner, not to a path, so they
          do not blank out on a swipe. */}
      <Section title="You said">
        {said.length === 0 ? null : <SaidShelf notes={said} onOpen={openNote} />}
      </Section>

      <Section title="Saved for later" bleed>
        {pathLoading ? (
          <SavedShelfSkeleton />
        ) : saved.length === 0 ? null : (
          <SavedShelf
            items={saved}
            onOpen={(item) => router.push(`/technique/${item.techniqueId}`)}
          />
        )}
      </Section>

      <Section title="Pick up where you stopped">
        {resume.length === 0 ? null : <ResumeRows points={resume} onResume={openResume} />}
      </Section>
    </>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.fixed, { paddingTop: insets.top + space.sm, maxWidth: contentWidth }]}>
        <TodayHeader dateLabel={todayLabel()} streak={streak.current} />
        <View style={[styles.strip, isWide && styles.stripWide]}>
          <WeekStrip
            week={week}
            selectedDay={openDay}
            onSelectDay={(day) => setOpenDay((current) => (current === day ? null : day))}
          />
        </View>

        {openDay === null || dayEntries.length === 0 ? null : (
          <DayPanel
            day={openDay}
            entries={dayEntries}
            notes={dayNotes}
            titleOf={(techniqueId) =>
              path?.techniques.find((technique) => technique.id === techniqueId)?.title ?? null
            }
            onClose={() => setOpenDay(null)}
          />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
      >
        {listError ? (
          <Card style={styles.errorCard}>
            <Text variant="heading">Can’t reach Reps</Text>
            <Text variant="body" tone="textSecondary" style={styles.errorLine}>
              {listError.code === 'NetworkError'
                ? 'Check that the API is running and you’re on the same network.'
                : listError.message}
            </Text>
            <Button label="Try again" variant="secondary" onPress={reload} />
          </Card>
        ) : null}

        {isWide ? (
          <View style={[styles.columns, { maxWidth: contentWidth }]}>
            <View style={styles.mainColumn}>
              {gradientHero}
              {aboutTheHobby}
              {aboutTheWork}
            </View>
            <View style={styles.sideColumn}>{aboutTheWeek}</View>
          </View>
        ) : (
          <>
            {gradientHero}
            <View style={[styles.stack, { maxWidth: contentWidth }]}>
              {aboutTheHobby}
              {aboutTheWeek}
              {aboutTheWork}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  fixed: { width: '100%', alignSelf: 'center' },
  strip: { paddingHorizontal: space.md, paddingBottom: space.sm },
  /* Seven flex columns across 1080 puts 150 points between day discs, which
     stops reading as a week. Capped and left-aligned with the content. */
  stripWide: { width: '100%', maxWidth: 460, paddingHorizontal: space.lg },
  scroll: { flex: 1 },
  /* No horizontal padding: the gradient runs to the screen edges, and each
     section supplies its own gutter. */
  content: { alignItems: 'center' },
  gradient: { width: '100%', alignSelf: 'center' },
  stack: { width: '100%' },
  columns: { width: '100%', flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' },
  mainColumn: { flex: 1, minWidth: 0 },
  sideColumn: { width: SIDE_COLUMN, flexShrink: 0 },
  empty: { alignItems: 'center', gap: space.base, paddingHorizontal: space.base },
  errorCard: { marginHorizontal: space.base, marginTop: space.sm, alignSelf: 'stretch' },
  errorLine: { marginTop: space.sm },
});
