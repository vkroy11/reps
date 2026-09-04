import { motion, springConfig, useReduceMotion } from '@reps/ui';
import { useEffect, useRef } from 'react';
import {
  runOnJS,
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
  /** Non-zero while an unlock is playing, so only then is the entrance applied. */
  playing: SharedValue<number>;
}

export interface UnlockSequenceInput {
  /** Where the trail should end up. */
  progress: number;
  /**
   * Where it should start from, when a completion has happened that this board
   * has not yet shown. Null means "no animation, just settle" - a first view,
   * or a return to a board with nothing new on it.
   */
  from: number | null;
  /** Called once the sequence has finished, so it is not replayed. */
  onPlayed: () => void;
}

/**
 * Two beats, in order: the trail travels to the newly reached disc, then the
 * disc arrives.
 *
 * The entrance is delayed to just past the trail's midpoint rather than to its
 * end, so the two overlap and read as one movement instead of two animations
 * queued back to back.
 *
 * **Why `from` is passed in rather than remembered here.** The completion
 * happens on a different screen, and the learner arrives on a freshly mounted
 * board. A ref inside this hook would initialise to the *new* progress and
 * there would be nothing to animate - which is exactly what happened before:
 * the trail was simply already full. The "last shown" figure has to outlive
 * the component, so it lives in the path cache and is handed down.
 */
export function useUnlockSequence(input: UnlockSequenceInput): UnlockSequence {
  const { progress, from, onPlayed } = input;
  const reduceMotion = useReduceMotion();

  const trail = useSharedValue(from ?? progress);
  const entrance = useSharedValue(1);
  const playing = useSharedValue(0);
  const played = useRef(false);

  useEffect(() => {
    const shouldPlay = from !== null && progress > from && !played.current;

    if (reduceMotion) {
      trail.value = progress;
      entrance.value = 1;
      playing.value = 0;
      if (shouldPlay) {
        played.current = true;
        onPlayed();
      }

      return;
    }

    if (!shouldPlay) {
      // Arriving, or a path that shrank because a technique was skipped: settle
      // rather than celebrate.
      trail.value = withTiming(progress, motion.trailFill);
      entrance.value = 1;
      playing.value = 0;

      return;
    }

    played.current = true;
    trail.value = from;
    playing.value = 1;
    entrance.value = 0;

    trail.value = withTiming(progress, motion.trailFill);
    entrance.value = withDelay(
      Math.round(motion.trailFill.duration * 0.55),
      withSpring(1, springConfig.pop, (finished) => {
        'worklet';

        if (!finished) return;

        playing.value = 0;
        runOnJS(onPlayed)();
      }),
    );
  }, [progress, from, reduceMotion, trail, entrance, playing, onPlayed]);

  return { trail, entrance, playing };
}
