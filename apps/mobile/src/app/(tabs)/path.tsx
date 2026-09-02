import type { Technique, TechniqueStatus } from '@reps/core';
import { PipLogo, Skeleton, Text, color, radius, space } from '@reps/ui';
import Flag from 'lucide-react-native/icons/flag';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';
import { usePath, usePathList } from '../../features/paths/usePaths';

/**
 * The path as a single vertical spine, the way the mockup draws it: nodes on a
 * continuous rail, alternating side to side for rhythm, lime behind you and
 * slate ahead.
 *
 * Deliberately not a branching graph - the moodboard capture of roadmap.sh on a
 * phone showed a wide graph collapsing to unreadable labels. Phase 5 adds the
 * start sheet and node animation on top of this.
 */
const NODE = 54;
const RAIL_WIDTH = 4;

export default function PathScreen() {
  const insets = useSafeAreaInsets();
  const { focusedId, paths, loading: listLoading } = usePathList();
  const { path, loading } = usePath(focusedId);

  const summary = paths.find((item) => item.id === focusedId) ?? null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xxl },
      ]}
    >
      <View style={styles.header}>
        {/* flex + minWidth:0 lets a long skill ellipsise instead of shoving the count off screen. */}
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
          {path.techniques.map((technique, index) => (
            <Step
              key={technique.id}
              technique={technique}
              alignRight={index % 2 === 1}
              isFirst={index === 0}
              isLast={index === path.techniques.length - 1}
              previousDone={
                index > 0 && path.techniques[index - 1]?.status === 'completed'
              }
            />
          ))}
          <View style={styles.finish}>
            <Flag size={20} color={color.iconDecorative} strokeWidth={2.4} />
            <Text variant="caption" tone="textSecondary">
              {path.goal}
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Step({
  technique,
  alignRight,
  isFirst,
  previousDone,
}: {
  technique: Technique;
  alignRight: boolean;
  isFirst: boolean;
  isLast: boolean;
  previousDone: boolean;
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

      <Node status={technique.status} />

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

function Node({ status }: { status: TechniqueStatus }) {
  const fill =
    status === 'completed'
      ? color.progress
      : status === 'active'
        ? color.brand
        : color.surfaceLocked;

  return (
    <View style={styles.node}>
      <Svg width={NODE} height={NODE} viewBox="0 0 54 54">
        {/* The current node wears a soft halo so "you are here" reads at a glance. */}
        {status === 'active' ? (
          <Circle cx={27} cy={27} r={26} stroke={color.brandSoft} strokeWidth={4} fill="none" />
        ) : null}
        <Circle cx={27} cy={27} r={status === 'active' ? 23 : 24} fill={fill} />

        {status === 'completed' ? (
          <SvgPath
            d="M17 27.5l6.5 6.5L38 20"
            stroke="#FFFFFF"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
        {status === 'active' ? <SvgPath d="M22 18v18l14-9z" fill="#FFFFFF" /> : null}
        {status === 'locked' ? (
          <SvgPath
            d="M20 26h14v10H20zM23 26v-4a4 4 0 0 1 8 0v4"
            stroke={color.iconDecorative}
            strokeWidth={2.4}
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
        {status === 'skipped' ? (
          <SvgPath
            d="M19 19l16 16M35 19L19 35"
            stroke={color.iconDecorative}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
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
  node: { width: NODE, height: NODE },
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
});
