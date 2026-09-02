import { useEffect } from 'react';
import { StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, duration, radius } from './tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Match the radius of whatever this stands in for. */
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * A placeholder in the shape of the answer, used instead of a spinner wherever
 * the layout is already known.
 *
 * The pulse is pure opacity - no gradient sweep, which would need either a
 * gradient dependency or an animated background position that RN cannot do on
 * the UI thread.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.card,
  style,
}: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.6;

      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.base, { width, height, borderRadius }, animatedStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: color.surfaceLocked },
});

/** Kept so screens can reference the same timing when staggering placeholders. */
export const skeletonPulseDuration = duration.slow;
