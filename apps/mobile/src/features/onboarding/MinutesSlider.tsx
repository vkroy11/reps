import { accentOn, radius, trackOn, useReduceMotion, type Panel } from '@reps/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const MIN = 5;
const MAX = 60;
const STEP = 5;
const THUMB = 28;
const TRACK_HEIGHT = 8;

export interface MinutesSliderProps {
  value: number;
  onChange: (minutes: number) => void;
  panel: Panel;
}

/**
 * The minutes-a-day control.
 *
 * Built on gesture-handler and Reanimated rather than adding a slider package,
 * for two reasons: this is the only slider in the app, and a community slider
 * is a native module, which would force a fresh development build for one
 * screen. Everything this needs is already installed.
 *
 * The drag never touches React frame by frame. The thumb and fill follow the
 * finger on the UI thread, and `onChange` is called from the worklet only when
 * the snapped step actually changes - so dragging the full range costs eleven
 * renders rather than one per frame.
 */
export function MinutesSlider({ value, onChange, panel }: MinutesSliderProps) {
  const reduceMotion = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);

  // 0 to 1, seeded from the incoming value so returning to this step shows the
  // saved answer instead of snapping up from zero.
  const ratio = useSharedValue(toRatio(value));
  const grabbed = useSharedValue(0);
  // The last step handed to React, so the worklet can tell a new step from a
  // new frame and only cross the bridge for the former.
  const reported = useSharedValue(value);

  const track = (event: { x: number }) => {
    'worklet';

    if (trackWidth === 0) return;

    ratio.value = clamp(event.x / trackWidth);

    const next = toMinutes(ratio.value);
    if (next === reported.value) return;

    reported.value = next;
    runOnJS(onChange)(next);
  };

  const pan = Gesture.Pan()
    // The bar is short and the thumb small, so a tap anywhere on it should
    // move the value rather than waiting for a drag to be recognised.
    .minDistance(0)
    .onBegin((event) => {
      grabbed.value = reduceMotion ? 1 : withSpring(1);
      track(event);
    })
    .onUpdate(track)
    .onFinalize(() => {
      grabbed.value = reduceMotion ? 0 : withSpring(0);
      // Settle onto the step that was reported, so the thumb and the big
      // number never disagree by a few pixels.
      const snapped = toRatio(reported.value);
      ratio.value = reduceMotion ? snapped : withTiming(snapped, { duration: 120 });
    });

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: ratio.value }] }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ratio.value * trackWidth - THUMB / 2 },
      { scale: 1 + grabbed.value * 0.12 },
    ],
  }));

  const accent = accentOn(panel);

  const nudge = (direction: 1 | -1) => {
    const next = Math.min(Math.max(value + direction * STEP, MIN), MAX);
    ratio.value = toRatio(next);
    reported.value = next;
    if (next !== value) onChange(next);
  };

  return (
    <GestureDetector gesture={pan}>
      {/* The hit area is taller than the bar: 8px is far under the 44px
          minimum target, and this padding is what makes it grabbable. */}
      <View
        style={styles.hitArea}
        accessibilityRole="adjustable"
        accessibilityLabel="Minutes a day"
        accessibilityValue={{ min: MIN, max: MAX, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)
        }
      >
        {/*
          trackOn, not panel.ghost. This bar lives inside a `panel.tile` card,
          which is white on every light panel - and ghost is translucent white
          there, so the unfilled groove disappeared completely.
        */}
        <View
          style={[styles.track, { backgroundColor: trackOn(panel) }]}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.fill, { backgroundColor: accent }, fillStyle]} />
        </View>
        <Animated.View
          style={[styles.thumb, { backgroundColor: accent, borderColor: panel.tile }, thumbStyle]}
        />
      </View>
    </GestureDetector>
  );
}

function clamp(value: number): number {
  'worklet';

  return Math.min(Math.max(value, 0), 1);
}

/** Snaps to the nearest step. Called from the drag worklet. */
function toMinutes(ratio: number): number {
  'worklet';

  return Math.round((MIN + ratio * (MAX - MIN)) / STEP) * STEP;
}

function toRatio(minutes: number): number {
  'worklet';

  return (Math.min(Math.max(minutes, MIN), MAX) - MIN) / (MAX - MIN);
}

const styles = StyleSheet.create({
  hitArea: { alignSelf: 'stretch', height: 44, justifyContent: 'center', marginTop: 12 },
  track: { height: TRACK_HEIGHT, borderRadius: radius.full, overflow: 'hidden' },
  fill: {
    height: '100%',
    width: '100%',
    borderRadius: radius.full,
    // Grow from the left edge, not the centre.
    transformOrigin: 'left center',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
});
