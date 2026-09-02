import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, hit, radius, space, springConfig } from './tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Suggestion chips on onboarding, format multi-select, path switcher. */
export function Chip({ label, selected = false, onPress, testID }: ChipProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = (value: number) => {
    scale.value = reduceMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(value, springConfig.press);
  };

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
          selected ? styles.selected : styles.unselected,
          animatedStyle,
        ]}
      >
        <Text variant="label" tone={selected ? 'brandPressed' : 'textPrimary'}>
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
    borderRadius: radius.chip,
    borderWidth: 1.5,
  },
  unselected: { backgroundColor: color.surfaceCard, borderColor: color.borderDefault },
  selected: { backgroundColor: color.brandSoft, borderColor: color.brand },
});
