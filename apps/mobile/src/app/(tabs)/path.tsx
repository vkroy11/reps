import { stageCount } from '@reps/core';
import { PipLogo, Skeleton, Text, color, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PathBoard } from '../../features/path/PathBoard';
import { StartSheet } from '../../features/paths/StartSheet';
import { usePath, usePathList } from '../../features/paths/usePaths';

/**
 * The path as a board-game map.
 *
 * Replaces the single vertical spine this screen used to draw. The spine was
 * readable but it was a list with dots - it gave no sense of a journey with a
 * destination, and it had nowhere to put the milestones. A serpentine board
 * does both: the trail fills behind you, gates punctuate every third technique,
 * and a finish marker holds the goal so the map has an end.
 *
 * Deliberately still not a branching graph. The moodboard capture of roadmap.sh
 * on a phone showed a wide graph collapsing to unreadable labels.
 */
export default function PathScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { focusedId, paths, loading: listLoading } = usePathList();
  const { path, loading } = usePath(focusedId);
  const [openId, setOpenId] = useState<string | null>(null);

  const summary = paths.find((item) => item.id === focusedId) ?? null;
  const techniques = path?.techniques ?? [];
  const openIndex = techniques.findIndex((item) => item.id === openId);
  const open = openIndex === -1 ? null : (techniques[openIndex] ?? null);

  // What has to be finished before a locked technique opens.
  const blockedBy =
    open?.status === 'locked'
      ? (techniques
          .slice(0, openIndex)
          .reverse()
          .find((item) => item.status === 'active' || item.status === 'locked') ?? null)
      : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        <View style={styles.header}>
          {/* flex + minWidth:0 lets a long skill ellipsise instead of shoving the count off. */}
          <Text variant="title" style={styles.title} numberOfLines={2}>
            {summary?.skill ?? 'Your path'}
          </Text>
          {summary ? (
            <Text variant="caption" tone="textSecondary" style={styles.count}>
              {summary.completedCount} of {summary.techniqueCount}
            </Text>
          ) : null}
        </View>

        {summary ? (
          <View style={styles.subhead}>
            <Text variant="caption" tone="textSecondary" numberOfLines={2}>
              {summary.goal}
            </Text>
            {/* XP and gates are the honest summary of the game layer: both are
                counted from stored sessions and badges, never estimated. */}
            <Text variant="caption" tone="textSecondary">
              {summary.xp} XP · {summary.badges.length} of{' '}
              {stageCount(summary.techniqueCount)} gates cleared
            </Text>
          </View>
        ) : null}

        {listLoading || loading ? (
          <View style={styles.stack}>
            <Skeleton height={64} />
            <Skeleton height={64} delay={80} />
            <Skeleton height={64} delay={160} />
          </View>
        ) : null}

        {!listLoading && !focusedId ? (
          <View style={styles.empty}>
            <PipLogo size={88} />
            <Text variant="body" tone="textSecondary" center>
              No path yet. Start one from Today.
            </Text>
          </View>
        ) : null}

        {path ? (
          <PathBoard techniques={path.techniques} goal={path.goal} onSelect={setOpenId} />
        ) : null}
      </ScrollView>

      <StartSheet
        technique={open}
        blockedBy={blockedBy}
        onClose={() => setOpenId(null)}
        onStart={(techniqueId) => {
          setOpenId(null);
          router.push(`/technique/${techniqueId}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  content: {
    paddingHorizontal: space.base,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { flex: 1, minWidth: 0 },
  count: { flexShrink: 0, paddingTop: 6 },
  subhead: { marginTop: space.xs, marginBottom: space.base, gap: 2 },
  stack: { gap: space.sm },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
});
