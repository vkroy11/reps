import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, radius, space, springConfig } from './tokens';

export interface AnswerCardProps {
  label: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** The single-select option used by onboarding questions 2 and 3. */
export function AnswerCard({
  label,
  description,
  selected = false,
  onPress,
  testID,
}: AnswerCardProps) {
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
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      onPressIn={() => press(0.985)}
      onPressOut={() => press(1)}
    >
      <Animated.View
        style={[styles.card, selected ? styles.selected : styles.unselected, animatedStyle]}
      >
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="textSecondary" style={styles.description}>
            {description}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 2, padding: space.base },
  unselected: { backgroundColor: color.surfaceCard, borderColor: color.borderDefault },
  selected: { backgroundColor: color.brandSoft, borderColor: color.brand },
  label: { fontSize: 16, lineHeight: 22 },
  description: { marginTop: space.xs },
});
