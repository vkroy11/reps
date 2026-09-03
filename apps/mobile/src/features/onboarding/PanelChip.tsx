import {
  Text,
  accentOn,
  hit,
  inkOn,
  radius,
  space,
  springConfig,
  useReduceMotion,
  type Panel,
} from '@reps/ui';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export interface PanelChipProps {
  label: string;
  panel: Panel;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * The pill-shaped chip used on the questionnaire panels.
 *
 * `packages/ui` already has a `Chip`, but that one is hardwired to the page
 * background - a `surfaceCard` fill with a grey border is invisible on the
 * brand panel. This one takes its unselected fill from the panel and inverts
 * selection against it, which is the only difference and the reason it exists
 * rather than being another `tone` prop on Chip.
 */
export function PanelChip({ label, panel, selected, onPress, testID }: PanelChipProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = (value: number) => {
    scale.value = reduceMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(value, springConfig.press);
  };

  const accent = accentOn(panel);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      onPressIn={() => press(0.96)}
      onPressOut={() => press(1)}
    >
      <Animated.View
        style={[
          styles.chip,
          selected
            ? { backgroundColor: accent }
            : { backgroundColor: panel.ghost, borderColor: panel.tile },
          animatedStyle,
        ]}
      >
        <Text variant="label" style={{ color: selected ? inkOn(panel) : panel.ink }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: hit.min,
    justifyContent: 'center',
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    borderRadius: radius.full,
  },
});
