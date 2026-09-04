import { PipMascot, Skeleton, Text, accentOn, radius, space, useReduceMotion, type Panel } from '@reps/ui';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const HOLD = 1600;
/** The sweep's share of the track width. */
const SWEEP_RATIO = 0.45;

/**
 * What the model is doing, while it does it.
 *
 * Three lines rather than one, because the wait is a few seconds and a single
 * frozen label reads as a hang. The lines describe real stages of the request
 * in order, so they are a narration of the work rather than a distraction from
 * it - but they are timed, not driven by the endpoint, which does not stream.
 */
export function LoadingSuggestions({ panel, skill }: { panel: Panel; skill: string | undefined }) {
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);

  const lines = [
    `Reading what ${skill?.trim() || 'this skill'} actually needs…`,
    'Sorting goals by what unlocks the most…',
    'Checking these are things you can practise…',
  ];

  useEffect(() => {
    if (reduceMotion) return;

    const timer = setInterval(() => {
      // Stops on the last line rather than looping: cycling forever would
      // suggest the request restarted.
      setIndex((current) => Math.min(current + 1, 2));
    }, HOLD);

    return () => clearInterval(timer);
  }, [reduceMotion]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.head, { backgroundColor: panel.tile }]}>
        <PipMascot size={42} expression="think" />
        <View style={styles.headCopy}>
          <Text variant="label" style={{ color: panel.ink }}>
            {lines[index]}
          </Text>
          <IndeterminateBar panel={panel} />
        </View>
      </View>

      {/*
        Same heights and radius as the cards they stand in for, so nothing
        shifts when the real answers arrive.

        Left on Skeleton's default surfaceLocked fill rather than tinted to the
        panel: its sweep is a white gradient, so a white box would shimmer
        white-on-white and look frozen - the one thing a skeleton must not do.
      */}
      <Skeleton height={92} borderRadius={20} />
      <Skeleton height={92} borderRadius={20} delay={90} />
      <Skeleton height={78} borderRadius={20} delay={180} />
    </View>
  );
}

/**
 * A bar with no percentage, because there is no percentage to report - the
 * suggestions endpoint answers once. It sweeps to say "still working" and
 * deliberately never fills, so it cannot imply progress it does not know.
 */
function IndeterminateBar({ panel }: { panel: Panel }) {
  const reduceMotion = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const shift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || trackWidth === 0) return;

    // Measured rather than expressed as a percentage: translateX in percent is
    // resolved against the animated view itself, not its parent, so a 45%-wide
    // sweep would travel 45% of its own width and barely move.
    shift.value = -trackWidth * SWEEP_RATIO;
    shift.value = withRepeat(
      withTiming(trackWidth, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
  }, [shift, reduceMotion, trackWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }));

  return (
    <View
      style={[styles.track, { backgroundColor: panel.ghost }]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.sweep, { backgroundColor: accentOn(panel) }, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 11 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.base, borderRadius: 20 },
  headCopy: { flex: 1, minWidth: 0 },
  track: {
    marginTop: 9,
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sweep: {
    width: `${SWEEP_RATIO * 100}%`,
    height: '100%',
    borderRadius: radius.full,
  },
});
