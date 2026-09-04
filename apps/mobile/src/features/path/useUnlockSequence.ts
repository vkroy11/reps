import { motion, springConfig, useReduceMotion } from '@reps/ui';
import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export interface UnlockSequence {
  /** 0-1 along the trail, driving strokeDashoffset on the progress path. */
  trail: SharedValue<number>;
  /** 0-1 entrance of the disc that just became active. */
  entrance: SharedValue<number>;
  /** True on the render where the entrance should be applied. */
  playing: SharedValue<number>;
}

/**
 * Two beats, in order: the trail travels to the newly reached disc, then the
 * disc arrives.
 *
 * The entrance is delayed to just past the trail's midpoint rather than to its
 * end, so the two overlap and read as one movement instead of two animations
 * queued back to back.
 *
 * Driven by watching `progress` change rather than by an imperative `play()`:
 * the board's progress comes from server state, so the completion that should
 * animate arrives as a new prop. A caller-invoked play would have to be kept in
 * sync with that, and would fire twice or not at all when a refetch landed.
 */
export function useUnlockSequence(progress: number): UnlockSequence {
  const reduceMotion = useReduceMotion();
  const trail = useSharedValue(progress);
  const entrance = useSharedValue(1);
  const playing = useSharedValue(0);
  const previous = useRef(progress);

  useEffect(() => {
    const advanced = progress > previous.current;
    previous.current = progress;

    if (reduceMotion) {
      trail.value = progress;
      entrance.value = 1;
      playing.value = 0;

      return;
    }

    trail.value = withTiming(progress, motion.trailFill);

    // Only an advance is worth celebrating. Arriving at the tab, or a path
    // shrinking because a technique was skipped, should just settle.
    if (!advanced) {
      entrance.value = 1;
      playing.value = 0;

      return;
    }

    playing.value = 1;
    entrance.value = 0;
    entrance.value = withDelay(
      Math.round(motion.trailFill.duration * 0.55),
      withSpring(1, springConfig.pop),
    );
  }, [progress, reduceMotion, trail, entrance, playing]);

  return { trail, entrance, playing };
}
