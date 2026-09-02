import { pathProgress } from '@reps/client';
import type { Technique } from '@reps/core';
import {
  Button,
  Card,
  PipLogo,
  ProgressBar,
  Skeleton,
  Text,
  color,
  space,
} from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PathSwitcher } from '../../features/paths/PathSwitcher';
import { usePath, usePathList } from '../../features/paths/usePaths';
import { useApp } from '../../providers/app-provider';

/**
 * Today has exactly one job: start today's technique. Everything else on the
 * screen exists to frame that decision - the goal above the bar, and what is
 * coming next below it.
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
  const upcoming =
    path?.techniques.filter((technique) => technique.status === 'locked').slice(0, 3) ?? [];

  return (
    <View style={styles.screen}>
      <View style={[styles.hud, { paddingTop: insets.top + space.sm }]}>
        <PipLogo size={34} />
        <Text variant="heading" style={styles.brand}>
          Reps
        </Text>
        <View style={styles.spacer} />
        {focusedSummary ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch skill"
            onPress={() => setSwitcherOpen(true)}
            style={styles.switcher}
            testID="open-switcher"
          >
            <Text variant="caption" tone="brandPressed" numberOfLines={1}>
              {focusedSummary.skill} ▾
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
      >
        {listLoading ? (
          <>
            <Skeleton height={18} width="70%" />
            <Skeleton height={10} delay={80} />
            <Skeleton height={150} delay={160} />
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
            <Text variant="caption" tone="textSecondary">
              {focusedSummary.goal}
            </Text>
            <View style={styles.bar}>
              <ProgressBar value={pathProgress(focusedSummary)} />
            </View>
            <Text variant="caption" tone="textSecondary">
              {focusedSummary.completedCount} of {focusedSummary.techniqueCount} techniques
            </Text>
          </>
        ) : null}

        {pathLoading && focusedSummary ? <Skeleton height={150} /> : null}

        {active ? (
          <>
            <Text variant="overline" tone="textSecondary" style={styles.label}>
              Today’s focus
            </Text>
            <Card>
              <Text variant="title">{active.title}</Text>
              <Text variant="caption" tone="textSecondary" style={styles.meta}>
                {active.modality.replace(/_/g, ' ')} · {active.estimatedMinutes} min
              </Text>
              <Text variant="body" style={styles.why}>
                {active.whyItMatters}
              </Text>
              <Button
                label="Start practice"
                onPress={() => router.push('/path')}
                testID="start-practice"
              />
            </Card>
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

        {upcoming.length > 0 ? (
          <>
            <Text variant="overline" tone="textSecondary" style={styles.label}>
              Next up
            </Text>
            {upcoming.map((technique) => (
              <LockedRow key={technique.id} technique={technique} />
            ))}
          </>
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

function LockedRow({ technique }: { technique: Technique }) {
  return (
    <Card style={styles.locked}>
      <Text variant="label" tone="textSecondary" numberOfLines={1} style={styles.lockedText}>
        {technique.title}
      </Text>
      <Text variant="caption" tone="textSecondary">
        {technique.estimatedMinutes} min
      </Text>
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
  },
  brand: { fontSize: 17 },
  spacer: { flex: 1 },
  switcher: {
    maxWidth: 160,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
    backgroundColor: color.brandSoft,
  },
  content: {
    paddingHorizontal: space.base,
    gap: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  bar: { flexDirection: 'row' },
  label: { marginTop: space.base },
  meta: { marginBottom: space.md },
  why: { marginBottom: space.base },
  gap: { marginVertical: space.sm },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
  locked: { flexDirection: 'row', alignItems: 'center', gap: space.sm, opacity: 0.72 },
  lockedText: { flex: 1, minWidth: 0 },
});
