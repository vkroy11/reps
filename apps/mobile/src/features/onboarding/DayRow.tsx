import { Text, accentOn, inkOn, springConfig, useReduceMotion, type Panel } from '@reps/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Monday-first, matching the week strip on Today. */
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const MIN_DAYS = 1;

export interface DayRowProps {
  /** How many days a week, 1 to 7. */
  value: number;
  onChange: (days: number) => void;
  panel: Panel;
}

/**
 * Seven cells that fill left to right, like a battery.
 *
 * The question is "how many days", not "which days" - the app never schedules
 * a specific weekday, so naming Tuesday would promise something it does not
 * do. The letters are there to make the count feel like a week rather than a
 * number, and every cell at or below the answer fills, so tapping the fifth
 * says five.
 */
export function DayRow({ value, onChange, panel }: DayRowProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Days a week"
    >
      {LETTERS.map((letter, index) => {
        const days = index + 1;

        return (
          <DayCell
            key={`${letter}${days}`}
            letter={letter}
            days={days}
            filled={value >= days}
            exact={value === days}
            panel={panel}
            onPress={() => onChange(Math.max(days, MIN_DAYS))}
          />
        );
      })}
    </View>
  );
}

function DayCell({
  letter,
  days,
  filled,
  exact,
  panel,
  onPress,
}: {
  letter: string;
  days: number;
  filled: boolean;
  exact: boolean;
  panel: Panel;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    // The chosen cell stays slightly larger, so "five days" is readable at a
    // glance without a separate numeral.
    transform: [{ scale: scale.value * (exact ? 1.06 : 1) }],
  }));

  const press = (target: number) => {
    scale.value = reduceMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(target, springConfig.press);
  };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: exact }}
      accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'} a week`}
      testID={`days-${days}`}
      onPress={onPress}
      onPressIn={() => press(0.95)}
      onPressOut={() => press(1)}
      style={styles.cellWrap}
    >
      <Animated.View
        style={[
          styles.cell,
          { backgroundColor: filled ? accentOn(panel) : panel.tile },
          animatedStyle,
        ]}
      >
        <Text variant="label" style={{ color: filled ? inkOn(panel) : panel.ink2 }}>
          {letter}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 7 },
  cellWrap: { flex: 1 },
  cell: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
