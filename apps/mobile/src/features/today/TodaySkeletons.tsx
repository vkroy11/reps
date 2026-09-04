import { Card, Skeleton, radius, space } from '@reps/ui';
import { ScrollView, StyleSheet, View } from 'react-native';

/**
 * Placeholders shaped like the thing that is coming.
 *
 * **Why per-section and not one big block.** Swiping to another hobby changes
 * only the path-dependent panels - the header, the week strip and the streak
 * are the same whichever hobby is in focus. Replacing the whole screen would
 * make a swipe look like a cold start, and would move the panels that did not
 * change. So each panel carries its own placeholder at its own size, and the
 * page never reflows around it.
 *
 * The staggered `delay` makes the shimmer read as one wave crossing the screen
 * rather than several boxes flashing independently.
 */

export function HeroSkeleton() {
  return (
    <View style={styles.hero}>
      <Skeleton width={168} height={26} borderRadius={radius.full} />
      <Skeleton width={148} height={12} borderRadius={4} delay={40} />
      <Skeleton width="86%" height={34} borderRadius={8} delay={80} />
      <Skeleton width={120} height={14} borderRadius={4} delay={120} />
      <View style={styles.planRow}>
        <Skeleton height={58} borderRadius={13} delay={160} style={styles.planStage} />
        <Skeleton height={58} borderRadius={13} delay={180} style={styles.planStage} />
        <Skeleton height={58} borderRadius={13} delay={200} style={styles.planStage} />
      </View>
      <Skeleton width="100%" height={46} borderRadius={radius.input} delay={240} />
      <Skeleton width={170} height={46} borderRadius={radius.full} delay={280} />
    </View>
  );
}

/** Four tiles, at the width the real shelf uses, so the shelf cannot shift. */
export function InsightTilesSkeleton() {
  return (
    <ScrollView horizontal scrollEnabled={false} contentContainerStyle={styles.shelf}>
      {[0, 1, 2, 3].map((index) => (
        <Skeleton
          key={index}
          width={136}
          height={122}
          borderRadius={radius.card}
          delay={index * 60}
        />
      ))}
    </ScrollView>
  );
}

export function NextGateSkeleton() {
  return (
    <Card>
      <View style={styles.gateRow}>
        <Skeleton width={46} height={46} borderRadius={radius.full} />
        <View style={styles.gateCopy}>
          <Skeleton width="70%" height={16} borderRadius={4} delay={60} />
          <Skeleton width="92%" height={12} borderRadius={4} delay={100} />
        </View>
      </View>
    </Card>
  );
}

export function SavedShelfSkeleton() {
  return (
    <ScrollView horizontal scrollEnabled={false} contentContainerStyle={styles.shelf}>
      {[0, 1, 2].map((index) => (
        <Skeleton
          key={index}
          width={168}
          height={148}
          borderRadius={radius.card}
          delay={index * 60}
        />
      ))}
    </ScrollView>
  );
}

export function HeatmapSkeleton() {
  return (
    <Card>
      <Skeleton width="100%" height={7 * 14 + 6 * 3} borderRadius={6} />
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingBottom: space.base },
  planRow: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  planStage: { flex: 1 },
  shelf: { gap: space.md, paddingHorizontal: space.base, paddingBottom: space.xs },
  gateRow: { flexDirection: 'row', alignItems: 'center', gap: space.md + 1 },
  gateCopy: { flex: 1, gap: space.sm },
});
