import { onboardingSteps, type OnboardingStep } from '@reps/client';
import { Button, ProgressBar, Text, color, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackIcon } from '../../components/icons';

export interface OnboardingScaffoldProps {
  step: OnboardingStep;
  question: string;
  /** Disabled until this step's answer exists, so nobody submits a gap. */
  canContinue: boolean;
  onContinue: () => void;
  continueLabel?: string;
  children: React.ReactNode;
}

/**
 * The frame every onboarding question shares: progress, back, the question as
 * the hero, and a sticky CTA. Screens supply only their answer control, which
 * is what keeps the five questions visually identical.
 */
export function OnboardingScaffold({
  step,
  question,
  canContinue,
  onContinue,
  continueLabel = 'Continue',
  children,
}: OnboardingScaffoldProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const index = onboardingSteps.indexOf(step);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <BackIcon />
        </Pressable>
        <ProgressBar value={(index + 1) / onboardingSteps.length} tone="brand" />
        <Text variant="caption" tone="textSecondary">
          {index + 1}/{onboardingSteps.length}
        </Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="display" style={styles.question}>
          {question}
        </Text>
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.base }]}>
        <Button label={continueLabel} onPress={onContinue} disabled={!canContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingBottom: space.sm,
  },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: space.base,
    paddingTop: space.base,
    paddingBottom: space.xl,
    gap: space.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  question: { marginBottom: space.xs },
  footer: {
    paddingHorizontal: space.base,
    paddingTop: space.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
});
