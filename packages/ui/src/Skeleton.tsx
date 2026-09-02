import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, radius } from './tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Match the radius of whatever this stands in for. */
  borderRadius?: number;
  style?: ViewStyle;
  /** Stagger a column of skeletons so the sweep reads as one wave. */
  delay?: number;
}

const SWEEP_DURATION = 1150;
/** The band is wider than the box so the highlight enters and exits smoothly. */
const BAND_RATIO = 0.7;

/**
 * A placeholder in the shape of the answer, used instead of a spinner wherever
 * the layout is already known.
 *
 * The highlight is a real gradient band swept with translateX. It uses
 * react-native-svg, which is already a dependency for icons and rings, so this
 * costs no new native module - and it animates a transform only, never a
 * background position or width.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.card,
  style,
  delay = 0,
}: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const [measured, setMeasured] = useState(0);
  const progress = useSharedValue(0);

  const bandWidth = Math.max(measured * BAND_RATIO, 1);

  useEffect(() => {
    if (reduceMotion || measured === 0) {
      progress.value = 0;

      return;
    }

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: SWEEP_DURATION + delay, easing: Easing.inOut(Easing.quad) }),
      -1,
    );
  }, [measured, progress, reduceMotion, delay]);

  const sweepStyle = useAnimatedStyle(() => ({
    // Travels from fully off the left edge to fully off the right edge.
    transform: [{ translateX: -bandWidth + progress.value * (measured + bandWidth) }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== measured) setMeasured(next);
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      onLayout={onLayout}
      style={[styles.base, { width, height, borderRadius }, style]}
    >
      {measured > 0 && !reduceMotion ? (
        <Animated.View style={[styles.band, { width: bandWidth, height }, sweepStyle]}>
          <Svg width={bandWidth} height={height}>
            <Defs>
              <LinearGradient id="skeletonSweep" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.9" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={bandWidth} height={height} fill="url(#skeletonSweep)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: color.surfaceLocked, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, left: 0 },
});
