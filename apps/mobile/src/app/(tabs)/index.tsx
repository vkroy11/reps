import { pathProgress } from '@reps/client';
import { Button, Card, PipLogo, ProgressBar, Skeleton, Text, color, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PathSwitcher } from '../../features/paths/PathSwitcher';
import { StreakChip } from '../../features/paths/StreakChip';
import { usePath, usePathList } from '../../features/paths/usePaths';
import { useApp } from '../../providers/app-provider';

/**
 * Today is the session, not the path.
 *
 * The Path tab already lists every technique, so repeating that here would be
 * two views of the same thing. Instead this screen carries what you cannot get
 * from the map: the actual rep to perform, how long it takes, and one button to
 * begin. What follows is reduced to a single line.
 */
export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { focusPath } = useApp();
  const { paths, focusedId, loading: listLoading, error: listError, reload } = usePathList();
  const { path, loading: pathLoading } = usePath(focusedId);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const focusedSummary = paths.find((item) => item.id === focusedId) ?? null;
  const active = path?.techniques.find((technique) => technique.status === 'active') ?? null;
  const next = path?.techniques.find((technique) => technique.status === 'locked') ?? null;

  return (
    <View style={styles.screen}>
      {/* One number in the HUD, on the right, and nothing else competing with it. */}
      <View style={[styles.hud, { paddingTop: insets.top + space.sm }]}>
        <PipLogo size={32} />
        <Text variant="heading" style={styles.brand}>
          Reps
        </Text>
        <View style={styles.spacer} />
        <StreakChip days={0} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
      >
        {listLoading ? (
          <>
            <Skeleton height={22} width="80%" />
            <Skeleton height={10} delay={80} />
            <Skeleton height={210} delay={160} />
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
            <PipLogo size={96} />
            <Text variant="title" center>
              Nothing here yet
            </Text>
            <Text variant="body" tone="textSecondary" center>
              Pick something to get good at and Reps will build a short path for it.
            </Text>
            <Button label="Get started" onPress={() => router.push('/onboarding/skill')} />
          </View>
        ) : null}

        {focusedSummary ? (
          <>
            {/*
              The skill sits above the progress bar on a full-width row: it can
              be a whole sentence ("I want to learn concurrency in Golang"), so
              it needs room to wrap rather than a corner to overflow out of.
            */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Learning ${focusedSummary.skill}. Switch skill.`}
              onPress={() => setSwitcherOpen(true)}
              style={styles.skillRow}
              testID="open-switcher"
            >
              <Text variant="title" style={styles.skillName} numberOfLines={2}>
                {focusedSummary.skill}
              </Text>
              {paths.length > 1 ? (
                <ChevronDown size={22} color={color.textSecondary} strokeWidth={2.4} />
              ) : null}
            </Pressable>

            <Text variant="caption" tone="textSecondary" numberOfLines={2}>
              {focusedSummary.goal}
            </Text>

            <View style={styles.progressRow}>
              <ProgressBar value={pathProgress(focusedSummary)} />
              {/* Fixed width and no shrink, so a long skill cannot push it away. */}
              <Text variant="caption" tone="textSecondary" style={styles.count}>
                {focusedSummary.completedCount}/{focusedSummary.techniqueCount}
              </Text>
            </View>
          </>
        ) : null}

        {pathLoading && focusedSummary ? <Skeleton height={210} /> : null}

        {active ? (
          <>
            <Text variant="overline" tone="textSecondary" style={styles.label}>
              Today · {active.estimatedMinutes} min
            </Text>
            <Card>
              <Text variant="title">{active.title}</Text>
              <Text variant="caption" tone="textSecondary" style={styles.meta}>
                {active.modality.replace(/_/g, ' ')}
              </Text>

              <Text variant="body">{active.whyItMatters}</Text>

              {/* The rep is the thing Path cannot show, so it leads here. */}
              <View style={styles.rep}>
                <Text variant="overline" tone="progressText">
                  The rep
                </Text>
                <Text variant="body" tone="progressText" style={styles.repText}>
                  {active.practicePrompt}
                </Text>
              </View>

              {active.resources.length > 0 ? (
                <Text variant="caption" tone="textSecondary" style={styles.resource} numberOfLines={2}>
                  Watch first: {active.resources[0]?.title}
                </Text>
              ) : null}

              <Button
                label="Start practice"
                onPress={() => router.push('/path')}
                testID="start-practice"
              />
            </Card>

            {next ? (
              <Text variant="caption" tone="textSecondary" numberOfLines={1} style={styles.after}>
                After this: {next.title}
              </Text>
            ) : null}
          </>
        ) : null}

        {path && !active ? (
          <Card tone="progress">
            <Text variant="heading" tone="progressText">
              Path complete
            </Text>
            <Text variant="caption" tone="progressText">
              Every technique on this path is done. Start another skill whenever you like.
            </Text>
          </Card>
        ) : null}
      </ScrollView>

      <PathSwitcher
        visible={switcherOpen}
        paths={paths}
        focusedId={focusedId}
        onSelect={(pathId) => {
          focusPath(pathId);
          setSwitcherOpen(false);
        }}
        onStartNew={() => {
          setSwitcherOpen(false);
          router.push('/onboarding/skill');
        }}
        onClose={() => setSwitcherOpen(false)}
      />
    </View>
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
  },
  brand: { fontSize: 17 },
  spacer: { flex: 1 },
  content: {
    paddingHorizontal: space.base,
    gap: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  skillName: { flex: 1, minWidth: 0 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  count: { flexShrink: 0 },
  label: { marginTop: space.base },
  meta: { marginBottom: space.md },
  rep: {
    marginTop: space.base,
    marginBottom: space.base,
    padding: space.md,
    borderRadius: 12,
    backgroundColor: color.progressSoft,
    gap: space.xs,
  },
  repText: { fontSize: 15, lineHeight: 21 },
  resource: { marginBottom: space.base },
  after: { marginTop: space.xs, textAlign: 'center' },
  gap: { marginVertical: space.sm },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
});
