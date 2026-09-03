import { Text, motion, useReduceMotion } from '@reps/ui';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const EXAMPLES = [
  'Try “chess” · “latte art” · “bouldering”',
  'Try “poker” · “watercolour” · “salsa”',
  'Try “wine tasting” · “calligraphy”',
];

const HOLD = 3000;

/**
 * Suggests the range of things Reps accepts, without listing them as options.
 *
 * The examples cycle because a static line gets read once and stops being
 * information. With Reduce Motion on it holds the first line rather than
 * swapping abruptly - a hard cut every three seconds is more distracting than
 * the fade it replaces.
 */
export function CyclingExamples({ color }: { color: string }) {
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % EXAMPLES.length);
    }, HOLD);

    return () => clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;

    // opacity only: no layout work, so this can loop for as long as the screen
    // is open without costing a frame.
    opacity.value = 0;
    opacity.value = withTiming(1, motion.cardEntrance);
  }, [index, opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.line, animatedStyle]}>
      <Text variant="caption" style={{ color }}>
        {EXAMPLES[index]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: 12 },
});
