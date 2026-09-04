import { stageCount } from '@reps/core';
import { Card, PipLogo, Text, color, space, useBreakpoint } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoardSkeleton } from '../../features/path/BoardSkeleton';
import { PathBoard } from '../../features/path/PathBoard';
import { StartSheet } from '../../features/paths/StartSheet';
import { TechniqueBrief } from '../../features/paths/TechniqueBrief';
import { usePathCache } from '../../features/paths/path-cache';
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
 *
 * On a wide window the board keeps its width and a second pane appears beside
 * it, so selecting a node fills the empty half instead of covering the board
 * with a sheet. This is the screen the two-pane breakpoint exists for.
 */
export default function PathScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const { focusedId, paths, loading: listLoading } = usePathList();
  const { path, loading } = usePath(focusedId);
  const { seenDone, markSeen } = usePathCache();
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

  const start = (techniqueId: string) => {
    setOpenId(null);
    router.push(`/technique/${techniqueId}`);
  };

  const header = (
    <>
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
    </>
  );

  const board = (
    <>
      {listLoading || loading ? <BoardSkeleton /> : null}

      {!listLoading && !focusedId ? (
        <View style={styles.empty}>
          <PipLogo size={88} />
          <Text variant="body" tone="textSecondary" center>
            No path yet. Start one from Today.
          </Text>
        </View>
      ) : null}

      {path ? (
        <PathBoard
          techniques={path.techniques}
          goal={path.goal}
          seenDone={seenDone(path.id)}
          onUnlockPlayed={(doneCount) => markSeen(path.id, doneCount)}
          onSelect={(techniqueId) =>
            // On a phone a second tap on the open node would reopen the sheet;
            // in the pane it should toggle the selection off.
            setOpenId((current) => (isWide && current === techniqueId ? null : techniqueId))
          }
        />
      ) : null}
    </>
  );

  if (isWide) {
    return (
      <View style={[styles.wide, { paddingTop: insets.top + space.base }]}>
        {/* Width belongs on the scroll view, not its content container: on
            the container the view still takes flex space and leaves a dead
            gap between the board and the detail pane. */}
        <ScrollView style={styles.boardPane} contentContainerStyle={styles.boardPaneContent}>
          {header}
          {board}
        </ScrollView>

        <View style={styles.detailPane}>
          {open ? (
            <ScrollView contentContainerStyle={styles.detailScroll}>
              <Card>
                <TechniqueBrief technique={open} blockedBy={blockedBy} onStart={start} />
              </Card>
            </ScrollView>
          ) : (
            /* An empty pane needs to say what fills it, or it reads as a
               rendering failure rather than as a waiting state. */
            <View style={styles.detailEmpty}>
              <PipLogo size={72} />
              <Text variant="body" tone="textSecondary" center>
                Pick a level on the board to see what it is for.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        {header}
        {board}
      </ScrollView>

      <StartSheet
        technique={open}
        blockedBy={blockedBy}
        onClose={() => setOpenId(null)}
        onStart={start}
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
  wide: { flex: 1, flexDirection: 'row', backgroundColor: color.surfacePage },
  boardPane: { width: 420, flexGrow: 0, flexShrink: 0 },
  boardPaneContent: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  detailPane: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: color.borderDefault,
    backgroundColor: color.surfaceCard,
  },
  detailScroll: { padding: space.lg, maxWidth: 560 },
  detailEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.base,
    padding: space.xl,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { flex: 1, minWidth: 0 },
  count: { flexShrink: 0, paddingTop: 6 },
  subhead: { marginTop: space.xs, marginBottom: space.base, gap: 2 },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
});
