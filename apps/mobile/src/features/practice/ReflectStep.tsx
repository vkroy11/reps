import type { Confidence } from '@reps/core';
import { Text, color, radius, space, springConfig, useReduceMotion } from '@reps/ui';
import Check from 'lucide-react-native/icons/check';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export interface ReflectStepProps {
  minutes: number;
  onReflect: (confidence: Confidence) => void;
  saving: boolean;
}

/** Each answer states its consequence, so honesty has a visible payoff. */
const OPTIONS: {
  value: Confidence;
  label: string;
  consequence: string;
  glyph: typeof Check;
  tint: string;
}[] = [
  {
    value: 'struggling',
    label: 'Still struggling',
    consequence: 'Two of these and Reps offers an easier step first.',
    glyph: LifeBuoy,
    tint: color.streakText,
  },
  {
    value: 'getting_there',
    label: 'Getting there',
    consequence: 'Stays your current rep. Come back to it tomorrow.',
    glyph: TrendingUp,
    tint: color.brand,
  },
  {
    value: 'solid',
    label: 'Solid, got it',
    consequence: 'Marks it mastered and unlocks the next one.',
    glyph: Check,
    tint: color.progressText,
  },
];

/**
 * How did that go?
 *
 * The three answers are deliberately not a rating. A 1-5 scale invites people
 * to average themselves toward the middle; these describe states, and each one
 * says what the app will *do* about it, so answering honestly has a visible
 * payoff rather than just a lower score.
 *
 * Only "Solid" completes the technique. Completion gates on self-assessed
 * confidence rather than on how much of a video was watched, which is the
 * product's whole argument about what learning is.
 */
export function ReflectStep({ minutes, onReflect, saving }: ReflectStepProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="title" center>
        How did that go?
      </Text>
      <Text variant="caption" tone="textSecondary" center style={styles.sub}>
        {minutes === 0
          ? 'Be honest — this is the only thing the path adapts to.'
          : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} practised. Be honest — this is the only thing the path adapts to.`}
      </Text>

      {OPTIONS.map((option) => (
        <ConfidenceCard
          key={option.value}
          option={option}
          disabled={saving}
          onPress={() => onReflect(option.value)}
        />
      ))}
    </View>
  );
}

function ConfidenceCard({
  option,
  disabled,
  onPress,
}: {
  option: (typeof OPTIONS)[number];
  disabled: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const Glyph = option.glyph;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = (value: number) => {
    scale.value = reduceMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(value, springConfig.press);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${option.label}. ${option.consequence}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => press(0.98)}
      onPressOut={() => press(1)}
      testID={`confidence-${option.value}`}
    >
      <Animated.View style={[styles.card, animatedStyle, disabled && styles.cardDisabled]}>
        <View style={[styles.glyph, { backgroundColor: `${option.tint}1A` }]}>
          <Glyph size={22} color={option.tint} strokeWidth={2.6} />
        </View>
        <View style={styles.copy}>
          <Text variant="heading">{option.label}</Text>
          {/* The consequence, not encouragement: what this answer changes. */}
          <Text variant="caption" tone="textSecondary" style={styles.consequence}>
            {option.consequence}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  sub: { marginBottom: space.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.base,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: color.borderDefault,
    backgroundColor: color.surfaceCard,
  },
  cardDisabled: { opacity: 0.6 },
  glyph: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  consequence: { lineHeight: 18 },
});
