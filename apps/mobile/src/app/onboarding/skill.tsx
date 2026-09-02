import { Chip, Text, color, radius, space, typeScale, useReduceMotion } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { OnboardingScaffold } from '../../features/onboarding/OnboardingScaffold';
import { useApp } from '../../providers/app-provider';

const POPULAR = [
  'Guitar',
  'Chess',
  'Cooking',
  'Photography',
  'Poker',
  'Drawing',
  'Bouldering',
  'Wine tasting',
];

const EXAMPLES = [
  'Try “chess” · “latte art” · “bouldering”',
  'Try “poker” · “watercolour” · “salsa”',
  'Try “wine tasting” · “calligraphy”',
];

export default function SkillScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();
  const [skill, setSkill] = useState(draft.skill ?? '');

  const trimmed = skill.trim();

  return (
    <OnboardingScaffold
      step="skill"
      question="What do you want to get good at?"
      canContinue={trimmed.length >= 2}
      onContinue={() => {
        // Changing the skill invalidates the answers derived from it.
        const changedSkill = trimmed.toLowerCase() !== (draft.skill ?? '').toLowerCase();
        patchDraft(
          changedSkill ? { skill: trimmed, goal: undefined, level: undefined } : { skill: trimmed },
        );
        router.push('/onboarding/goal');
      }}
    >
      <TextInput
        value={skill}
        onChangeText={setSkill}
        placeholder="Guitar"
        placeholderTextColor={color.iconDecorative}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        accessibilityLabel="The skill you want to get good at"
        style={styles.input}
      />

      <CyclingExamples />

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Popular
      </Text>
      <View style={styles.chips}>
        {POPULAR.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={trimmed.toLowerCase() === item.toLowerCase()}
            onPress={() => setSkill(item)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

/** Wondering's pattern: the question is the hero, examples suggest the range. */
function CyclingExamples() {
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % EXAMPLES.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;

    // opacity only: no layout work, so this can loop forever safely.
    opacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }),
    );
  }, [index, opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animatedStyle}>
      <Text variant="caption" tone="textSecondary">
        {EXAMPLES[index]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  input: {
    ...typeScale.heading,
    color: color.textPrimary,
    backgroundColor: color.surfaceCard,
    borderWidth: 2,
    borderColor: color.brand,
    borderRadius: radius.input,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    minHeight: 56,
  },
  label: { marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
