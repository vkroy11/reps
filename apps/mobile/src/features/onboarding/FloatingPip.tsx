import { motion, useReduceMotion } from '@reps/ui';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Lifts Pip a few pixels and puts him back, forever.
 *
 * translateY only, on the UI thread, so an animation that never stops costs
 * nothing per frame on the JS side. The distance is deliberately small and the
 * period long: a mascot that bounces hard pulls attention away from the
 * question, which is the thing that needs reading.
 */
export function FloatingPip({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      lift.value = 0;

      return;
    }

    lift.value = withRepeat(
      withTiming(-motion.floatDistance, {
        duration: motion.floatPeriod / 2,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [lift, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
