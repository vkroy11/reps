import { formatTimestamp } from '@reps/client';
import { Button, ProgressRing, Text, color, space } from '@reps/ui';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export interface PracticeTimerProps {
  /** The technique's estimate, used as the ring's full turn. */
  targetMinutes: number;
  /** Called with whole minutes practised when the learner finishes. */
  onDone: (minutes: number) => void;
  /**
   * Filled with a reader for the minutes practised so far.
   *
   * A ref rather than a prop callback: the deck finishing has to end the
   * session with the right minutes, and the session must not re-render once a
   * second to know what they are.
   */
  elapsedRef?: MutableRefObject<(() => number) | null>;
}

/**
 * A stopwatch for one rep.
 *
 * Counts **up**, not down. A countdown says "endure this for twelve minutes";
 * counting up says "here is what you did", and it cannot punish someone for
 * stopping at nine or reward them for staring at a finished timer. The ring
 * fills toward the estimate and simply stays full past it.
 *
 * Elapsed time is tracked as a wall-clock delta rather than by incrementing a
 * counter each tick, so a backgrounded app - where timers are throttled or
 * suspended - resumes with the right number instead of however many ticks the
 * OS allowed.
 */
export function PracticeTimer({ targetMinutes, onDone, elapsedRef }: PracticeTimerProps) {
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  /** Accumulated seconds from previous run stretches. */
  const bankedRef = useRef(0);
  const startedAtRef = useRef(Date.now());

  // Read from the same wall-clock delta the display uses, so a caller can ask
  // at any moment without waiting for the next tick.
  const minutesNow = useCallback(
    () =>
      Math.floor(
        (bankedRef.current + (running ? (Date.now() - startedAtRef.current) / 1000 : 0)) / 60,
      ),
    [running],
  );

  useEffect(() => {
    if (!elapsedRef) return;

    elapsedRef.current = minutesNow;

    return () => {
      elapsedRef.current = null;
    };
  }, [elapsedRef, minutesNow]);

  useEffect(() => {
    if (!running) return;

    startedAtRef.current = Date.now();
    const tick = () => {
      const live = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(bankedRef.current + live);
    };

    tick();
    // 1 Hz: the display has second resolution, so anything faster is renders
    // nobody can see.
    const timer = setInterval(tick, 1000);

    return () => {
      clearInterval(timer);
      bankedRef.current += (Date.now() - startedAtRef.current) / 1000;
    };
  }, [running]);

  const seconds = Math.floor(elapsed);
  const targetSeconds = Math.max(targetMinutes, 1) * 60;
  const minutes = Math.floor(seconds / 60);

  return (
    <View style={styles.wrap}>
      <View style={styles.dial}>
        <ProgressRing
          value={seconds / targetSeconds}
          size={208}
          strokeWidth={12}
          tint={color.progress}
        />
        <View style={styles.readout} pointerEvents="none">
          <Text style={styles.clock}>{formatTimestamp(seconds)}</Text>
          <Text variant="caption" tone="textSecondary">
            of {targetMinutes} min
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={running ? 'Pause the timer' : 'Resume the timer'}
        onPress={() => setRunning((value) => !value)}
        style={styles.toggle}
        testID="timer-toggle"
      >
        {running ? (
          <Pause size={22} color={color.brand} strokeWidth={2.6} />
        ) : (
          <Play size={22} color={color.brand} strokeWidth={2.6} fill={color.brand} />
        )}
        <Text variant="label" tone="brand">
          {running ? 'Pause' : 'Resume'}
        </Text>
      </Pressable>

      {/*
        Always enabled, including at 0:00. Somebody who practised away from the
        phone still needs to record the rep, and blocking the only way out of
        this screen until an arbitrary time has passed would just teach them to
        leave it running.
      */}
      <Button
        label="I'm done"
        onPress={() => onDone(minutes)}
        style={styles.done}
        testID="timer-done"
      />
      <Text variant="caption" tone="textSecondary" center>
        {minutes === 0
          ? 'Under a minute counts as practice, it just earns no minutes.'
          : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} will be recorded.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.base },
  dial: { alignItems: 'center', justifyContent: 'center' },
  readout: { position: 'absolute', alignItems: 'center', gap: 2 },
  clock: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1,
    color: color.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  done: { alignSelf: 'stretch', marginTop: space.sm },
});
