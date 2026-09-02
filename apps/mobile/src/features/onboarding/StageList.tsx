import { Text, color, space, useReduceMotion } from '@reps/ui';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

export type StageState = 'done' | 'active' | 'pending' | 'failed';

export interface Stage {
  label: string;
  state: StageState;
}

/**
 * The three real pipeline stages the API runs: plan the techniques, retrieve
 * candidate resources, then rank them. Showing the actual stages is what makes
 * a 20-second wait feel like work rather than a hang.
 */
export function StageList({ stages }: { stages: Stage[] }) {
  return (
    <View style={styles.list}>
      {stages.map((stage, index) => (
        <StageRow key={stage.label} stage={stage} index={index} />
      ))}
    </View>
  );
}

function StageRow({ stage, index }: { stage: Stage; index: number }) {
  const reduceMotion = useReduceMotion();
  const entrance = useSharedValue(reduceMotion ? 1 : 0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      entrance.value = 1;

      return;
    }

    // Staggered so the list assembles rather than appearing all at once.
    entrance.value = withDelay(
      index * 120,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
    );
  }, [entrance, index, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || stage.state !== 'active') {
      spin.value = 0;

      return;
    }

    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
  }, [spin, stage.state, reduceMotion]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 6 }],
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const tone =
    stage.state === 'failed'
      ? 'danger'
      : stage.state === 'pending'
        ? 'textSecondary'
        : 'textPrimary';

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.marker}>
        {stage.state === 'done' ? (
          <Svg width={26} height={26} viewBox="0 0 26 26">
            <Circle cx={13} cy={13} r={13} fill={color.progress} />
            <Path
              d="M7 13.5l4 4 8-8"
              stroke="#FFFFFF"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        ) : null}

        {stage.state === 'active' ? (
          <Animated.View style={spinnerStyle}>
            <Svg width={26} height={26} viewBox="0 0 26 26">
              <Circle
                cx={13}
                cy={13}
                r={11}
                stroke={color.brand}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                strokeDasharray="52 20"
              />
            </Svg>
          </Animated.View>
        ) : null}

        {stage.state === 'pending' ? (
          <Svg width={26} height={26} viewBox="0 0 26 26">
            <Circle cx={13} cy={13} r={11} stroke={color.borderStrong} strokeWidth={2.5} fill="none" />
          </Svg>
        ) : null}

        {stage.state === 'failed' ? (
          <Svg width={26} height={26} viewBox="0 0 26 26">
            <Circle cx={13} cy={13} r={11} stroke={color.danger} strokeWidth={2.5} fill="none" />
            <Path d="M13 7v8M13 18h.01" stroke={color.danger} strokeWidth={2.6} strokeLinecap="round" />
          </Svg>
        ) : null}
      </View>

      <Text variant="label" tone={tone} style={styles.label}>
        {stage.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  marker: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0, fontSize: 16 },
});
