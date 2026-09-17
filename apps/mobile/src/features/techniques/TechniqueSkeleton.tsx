import { Card, Skeleton, radius, space } from '@reps/ui';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

/** Mirrors the screen's own content box: 16px either side, capped at 640. */
const H_PADDING = space.base * 2;
const MAX_CONTENT = 640;

/**
 * A placeholder shaped like the technique screen.
 *
 * The screen it stands in for is a fixed sequence - meta line, "Why this",
 * "Learn" with a 16:9 media block, "Practice", and the button that starts the
 * rep - so the placeholder can be that sequence at those sizes. The previous
 * version was three grey boxes of arbitrary height, which meant the content
 * arriving reflowed the whole page: the eye had already settled on shapes that
 * were not where anything was going to be.
 *
 * The media block is a 16:9 box because that is the video, and an article card
 * is given the same footprint - both fill the same slot, and guessing which
 * one is coming would be wrong half the time.
 */
export function TechniqueSkeleton() {
  /*
    `Skeleton` needs a real height - its shimmer is an SVG, which cannot be
    laid out by aspect ratio - so the 16:9 block is computed from the same
    width the content box will actually have.
  */
  const { width } = useWindowDimensions();
  const mediaHeight = Math.round((Math.min(width, MAX_CONTENT) - H_PADDING) * (9 / 16));

  return (
    <View style={styles.wrap} testID="technique-skeleton">
      {/* modality · minutes */}
      <Skeleton width={132} height={11} borderRadius={4} />

      {/* Why this */}
      <Skeleton width={64} height={10} borderRadius={4} delay={40} style={styles.label} />
      <Skeleton width="100%" height={14} borderRadius={4} delay={80} />
      <Skeleton width="78%" height={14} borderRadius={4} delay={100} style={styles.line} />

      {/* Learn */}
      <Skeleton width={44} height={10} borderRadius={4} delay={140} style={styles.label} />
      <Skeleton height={mediaHeight} borderRadius={radius.card} delay={180} style={styles.media} />
      <Skeleton height={46} borderRadius={radius.input} delay={220} style={styles.line} />

      {/* Practice */}
      <Skeleton width={66} height={10} borderRadius={4} delay={260} style={styles.label} />
      <Card tone="progress">
        <Skeleton width="92%" height={13} borderRadius={4} delay={300} />
        <Skeleton width="64%" height={13} borderRadius={4} delay={320} style={styles.line} />
      </Card>

      <Skeleton height={48} borderRadius={radius.full} delay={360} style={styles.start} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  label: { marginTop: space.base },
  line: { marginTop: space.xs },
  media: { marginTop: space.xs },
  start: { marginTop: space.lg },
});
