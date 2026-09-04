import type { Technique } from '@reps/core';
import { PathNode, PipLogo, Skeleton, Text, color, radius, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import Flag from 'lucide-react-native/icons/flag';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StartSheet } from '../../features/paths/StartSheet';
import { usePath, usePathList } from '../../features/paths/usePaths';

/**
 * The path as a single vertical spine: nodes on a continuous rail, alternating
 * side to side for rhythm, lime behind you and slate ahead.
 *
 * Deliberately not a branching graph - the moodboard capture of roadmap.sh on a
 * phone showed a wide graph collapsing to unreadable labels. Every node is
 * tappable, including locked ones, because a tap that does nothing reads as a
 * broken app.
 */
const NODE = 54;
const RAIL_WIDTH = 4;

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
          <Text variant="caption" tone="textSecondary" numberOfLines={2} style={styles.goal}>
            {summary.goal}
          </Text>
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
          <View style={styles.spine}>
            {techniques.map((technique, index) => (
              <Step
                key={technique.id}
                technique={technique}
                alignRight={index % 2 === 1}
                isFirst={index === 0}
                previousDone={index > 0 && techniques[index - 1]?.status === 'completed'}
                onPress={() => setOpenId(technique.id)}
              />
            ))}
            <View style={styles.finish}>
              <Flag size={20} color={color.iconDecorative} strokeWidth={2.4} />
              <Text variant="caption" tone="textSecondary" style={styles.finishText}>
                {path.goal}
              </Text>
            </View>
          </View>
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

function Step({
  technique,
  alignRight,
  isFirst,
  previousDone,
  onPress,
}: {
  technique: Technique;
  alignRight: boolean;
  isFirst: boolean;
  previousDone: boolean;
  onPress: () => void;
}) {
  const active = technique.status === 'active';
  const done = technique.status === 'completed';
  const skipped = technique.status === 'skipped';

  return (
    <View style={[styles.step, alignRight && styles.stepRight]}>
      {/* The rail segment above this node, coloured by what came before it. */}
      {!isFirst ? (
        <View
          style={[
            styles.rail,
            alignRight ? styles.railRight : styles.railLeft,
            { backgroundColor: previousDone ? color.progress : color.surfaceLocked },
          ]}
        />
      ) : null}

      <PathNode
        status={technique.status}
        size={NODE}
        onPress={onPress}
        label={`${technique.title}, ${technique.status}`}
        testID={`node-${technique.id}`}
      />

      <View style={styles.stepText}>
        <Text
          variant="label"
          tone={active ? 'brand' : done ? 'progressText' : skipped ? 'textSecondary' : 'textPrimary'}
          numberOfLines={2}
          style={skipped ? styles.struck : undefined}
        >
          {technique.title}
        </Text>
        {active ? (
          <Text variant="caption" tone="brand">
            You are here
          </Text>
        ) : (
          <Text variant="caption" tone="textSecondary" numberOfLines={1}>
            {skipped ? 'Not for me' : `${technique.estimatedMinutes} min`}
          </Text>
        )}
      </View>
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
  goal: { marginTop: space.xs, marginBottom: space.lg },
  stack: { gap: space.sm },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
  spine: { paddingLeft: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.base, paddingVertical: space.sm },
  stepRight: { paddingLeft: space.xl },
  rail: {
    position: 'absolute',
    width: RAIL_WIDTH,
    top: -space.lg,
    height: space.xl,
    borderRadius: radius.full,
  },
  railLeft: { left: NODE / 2 - RAIL_WIDTH / 2 },
  railRight: { left: NODE / 2 - RAIL_WIDTH / 2 + space.xl },
  stepText: { flex: 1, minWidth: 0, gap: 2 },
  struck: { textDecorationLine: 'line-through' },
  finish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: NODE / 2 - 10,
    paddingTop: space.base,
  },
  finishText: { flex: 1, minWidth: 0 },
});
