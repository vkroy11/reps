import type { Technique, TechniqueStatus } from '@reps/core';
import { Card, PipLogo, Skeleton, Text, color, radius, space } from '@reps/ui';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';
import { usePath, usePathList } from '../../features/paths/usePaths';

/**
 * The path, as an ordered list of techniques with their state.
 *
 * Phase 5 turns this into the designed vertical spine with mastery rings and
 * the start sheet; this is the honest interim - every node, its real status,
 * and why it matters.
 */
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
        { paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xl },
      ]}
    >
      <View style={styles.header}>
        <Text variant="title">{summary?.skill ?? 'Your path'}</Text>
        {summary ? (
          <Text variant="caption" tone="textSecondary">
            {summary.completedCount} of {summary.techniqueCount}
          </Text>
        ) : null}
      </View>

      {summary ? (
        <Text variant="caption" tone="textSecondary">
          {summary.goal}
        </Text>
      ) : null}

      {listLoading || loading ? (
        <View style={styles.stack}>
          <Skeleton height={70} />
          <Skeleton height={70} delay={80} />
          <Skeleton height={70} delay={160} />
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

      {path?.techniques.map((technique, index) => (
        <TechniqueRow
          key={technique.id}
          technique={technique}
          isLast={index === path.techniques.length - 1}
        />
      ))}
    </ScrollView>
  );
}

function TechniqueRow({ technique, isLast }: { technique: Technique; isLast: boolean }) {
  const done = technique.status === 'completed';
  const active = technique.status === 'active';
  const skipped = technique.status === 'skipped';

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <Node status={technique.status} />
        {/* The trail is lime behind you and slate ahead. */}
        {!isLast ? (
          <View
            style={[styles.trail, { backgroundColor: done ? color.progress : color.surfaceLocked }]}
          />
        ) : null}
      </View>

      <Card
        tone={active ? 'brand' : done ? 'progress' : 'default'}
        style={[styles.card, skipped && styles.skipped]}
      >
        <Text
          variant="label"
          tone={active ? 'brandPressed' : done ? 'progressText' : 'textPrimary'}
          style={skipped ? styles.struck : undefined}
        >
          {technique.order + 1}. {technique.title}
        </Text>
        <Text variant="caption" tone="textSecondary" style={styles.meta}>
          {technique.modality.replace(/_/g, ' ')} · {technique.estimatedMinutes} min
          {technique.resources.length > 0 ? ` · ${technique.resources.length} resource` : ''}
          {skipped ? ' · not for me' : ''}
        </Text>
        {active ? <Text variant="caption" tone="brandPressed">You are here</Text> : null}
      </Card>
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
    <Svg width={34} height={34} viewBox="0 0 34 34">
      <Circle cx={17} cy={17} r={17} fill={fill} />
      {status === 'completed' ? (
        <SvgPath
          d="M10 17.5l4.5 4.5L24 12.5"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
      {status === 'active' ? <SvgPath d="M14 11.5v11l9-5.5z" fill="#FFFFFF" /> : null}
      {status === 'locked' ? (
        <SvgPath
          d="M12.5 16.5h9v6h-9zM14.5 16.5v-2.5a2.5 2.5 0 0 1 5 0v2.5"
          stroke={color.iconDecorative}
          strokeWidth={1.8}
          fill="none"
        />
      ) : null}
      {status === 'skipped' ? (
        <SvgPath
          d="M12 12l10 10M22 12l-10 10"
          stroke={color.iconDecorative}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  content: {
    paddingHorizontal: space.base,
    gap: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  stack: { gap: space.sm, marginTop: space.sm },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  rail: { alignItems: 'center', width: 34, paddingTop: space.base },
  trail: { width: 4, flex: 1, minHeight: space.lg, borderRadius: radius.full, marginTop: 2 },
  card: { flex: 1, minWidth: 0, marginBottom: space.sm },
  skipped: { opacity: 0.6 },
  struck: { textDecorationLine: 'line-through' },
  meta: { marginTop: 2 },
});
