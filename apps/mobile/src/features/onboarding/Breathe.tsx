import { useReduceMotion } from '@reps/ui';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const PERIOD = 3000;
const SCALE = 1.03;

/**
 * A slow, shallow swell. Used behind Pip so the halo looks alive rather than
 * printed on.
 *
 * scale only, and only 3% of it - enough to notice out of the corner of the
 * eye, not enough to read as a pulse demanding attention.
 */
export function Breathe({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;

      return;
    }

    scale.value = withRepeat(
      withTiming(SCALE, { duration: PERIOD / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [scale, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.View pointerEvents="none" style={[style, animatedStyle]} />;
}
