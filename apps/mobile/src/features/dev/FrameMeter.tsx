import { Text, color, radius, space } from '@reps/ui';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

/** A frame slower than this counts as dropped at 60Hz. */
const DROP_THRESHOLD_MS = 1000 / 55;
/** How often the readout updates. Faster and it becomes its own jank. */
const REPORT_MS = 500;

interface Sample {
  ui: number;
  js: number;
  worstMs: number;
  dropped: number;
}

/**
 * Frames per second on both threads, for use on a real device.
 *
 * **Why both.** Reanimated runs animations on the UI thread and React renders
 * on the JS thread, so a single number cannot tell you which one is stalling.
 * A smooth-looking animation with a pinned JS thread means a render loop; a
 * healthy JS thread with a stuttering UI thread means the animation itself is
 * too expensive. The whole motion strategy in this app - transform and opacity
 * only, worklets, no layout animation - is a bet that the UI thread stays at
 * 60 while JS does whatever it likes, and this is what checks that bet.
 *
 * **Why on device.** A simulator renders in software and a browser runs
 * Reanimated through a different path entirely, so neither produces a number
 * worth quoting. This has to be read on hardware.
 *
 * Dev-only, and off until tapped, because a meter that samples every frame is
 * itself a small cost.
 */
export function FrameMeter() {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState<Sample>({ ui: 0, js: 0, worstMs: 0, dropped: 0 });

  // UI-thread accumulators live in shared values: touching React state from
  // the frame callback would be measuring the measurement.
  const uiFrames = useSharedValue(0);
  const uiWorst = useSharedValue(0);
  const uiDropped = useSharedValue(0);
  const jsFrames = useRef(0);

  useFrameCallback((frame) => {
    if (frame.timeSincePreviousFrame === null) return;

    uiFrames.value += 1;
    uiWorst.value = Math.max(uiWorst.value, frame.timeSincePreviousFrame);
    if (frame.timeSincePreviousFrame > DROP_THRESHOLD_MS) uiDropped.value += 1;
  }, open);

  useEffect(() => {
    if (!open) return;

    let running = true;
    let raf = 0;

    const count = () => {
      if (!running) return;

      jsFrames.current += 1;
      raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);

    const report = setInterval(() => {
      const seconds = REPORT_MS / 1000;
      const next: Sample = {
        ui: Math.round(uiFrames.value / seconds),
        js: Math.round(jsFrames.current / seconds),
        worstMs: Math.round(uiWorst.value),
        dropped: uiDropped.value,
      };

      uiFrames.value = 0;
      uiWorst.value = 0;
      jsFrames.current = 0;
      setSample(next);
    }, REPORT_MS);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      clearInterval(report);
    };
  }, [open, uiFrames, uiWorst, uiDropped]);

  const resetDropped = () => {
    uiDropped.value = 0;
    setSample((current) => ({ ...current, dropped: 0 }));
  };

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show the frame meter"
        onPress={() => setOpen(true)}
        style={styles.handle}
        testID="frame-meter-open"
      >
        <Text variant="overline" style={styles.handleText}>
          FPS
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hide the frame meter"
        onPress={() => setOpen(false)}
        style={styles.rows}
      >
        <Row label="UI" value={`${sample.ui}`} bad={sample.ui > 0 && sample.ui < 55} />
        <Row label="JS" value={`${sample.js}`} bad={sample.js > 0 && sample.js < 30} />
        <Row label="worst" value={`${sample.worstMs}ms`} bad={sample.worstMs > 32} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset the dropped frame count"
        onPress={resetDropped}
        style={styles.rows}
      >
        <Row label="dropped" value={`${sample.dropped}`} bad={sample.dropped > 0} />
      </Pressable>
    </View>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="overline" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="label" style={[styles.rowValue, bad && styles.rowValueBad]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    right: 6,
    bottom: 96,
    paddingVertical: 4,
    paddingHorizontal: space.sm,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(11,18,32,0.7)',
  },
  handleText: { color: '#FFFFFF' },
  panel: {
    position: 'absolute',
    right: 6,
    bottom: 96,
    padding: space.sm,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(11,18,32,0.86)',
    minWidth: 104,
    gap: 2,
  },
  rows: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rowLabel: { color: '#94A3B8' },
  rowValue: { color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  rowValueBad: { color: color.streak },
});
