import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, duration, easing, radius } from './tokens';

export interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  tone?: 'brand' | 'progress';
  height?: number;
}

/**
 * Fills with scaleX, never by animating width - animating width runs layout on
 * every frame, which is the most common cause of a janky progress bar.
 */
export function ProgressBar({ value, tone = 'progress', height = 10 }: ProgressBarProps) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(value);

  useEffect(() => {
    const clamped = Math.min(Math.max(value, 0), 1);
    progress.value = reduceMotion
      ? withTiming(clamped, { duration: 0 })
      : withTiming(clamped, {
          duration: duration.slow,
          easing: Easing.bezier(...easing.standard),
        });
  }, [value, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.track, { height }]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: tone === 'brand' ? color.brand : color.progress },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: color.surfaceLocked,
    borderRadius: radius.full,
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    height: '100%',
    width: '100%',
    borderRadius: radius.full,
    // Grow from the left edge rather than the centre.
    transformOrigin: 'left center',
  },
});
