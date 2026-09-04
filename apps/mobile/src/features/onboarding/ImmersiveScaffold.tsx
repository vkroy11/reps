import { flowProgress, onboardingFlow, type OnboardingFlowStep } from '@reps/client';
import {
  Button,
  KeyboardAvoider,
  PipMascot,
  ProgressRing,
  Text,
  accentOn,
  panels,
  radius,
  space,
  trackOn,
  type PanelKey,
} from '@reps/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackIcon } from '../../components/icons';
import { FloatingPip } from './FloatingPip';

export interface ImmersiveScaffoldProps {
  step: OnboardingFlowStep & PanelKey;
  /** The heading. Carries the whole screen, so it is the largest thing on it. */
  question: string;
  /** One line under the question: what this answer actually decides. */
  aside: string;
  /** Pip's line. Says something about the question, never "you've got this". */
  pipAside: string;
  /** Pip thinks while suggestions load, idles otherwise. */
  thinking?: boolean;
  /**
   * Omit both to render no CTA at all.
   *
   * A step whose only way forward is tapping an answer should not show a
   * button that can never enable: a permanently greyed-out Continue reads as
   * something broken, or as a step the learner has failed to satisfy.
   */
  canContinue?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
  children: React.ReactNode;
}

/**
 * The frame every question shares: its panel colour, the back button, a
 * progress ring, Pip with an aside, the question, and a CTA pinned to the
 * bottom.
 *
 * The panel is painted here rather than in the layout because each step owns
 * its own colour and the stack cross-fades between screens - so the outgoing
 * panel dissolves into the incoming one with no colour interpolation to run.
 */
export function ImmersiveScaffold({
  step,
  question,
  aside,
  pipAside,
  thinking = false,
  canContinue = false,
  onContinue,
  continueLabel = 'Continue',
  children,
}: ImmersiveScaffoldProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const panel = panels[step];
  const accent = accentOn(panel);
  const position = onboardingFlow.indexOf(step);

  return (
    // The keyboard container is the screen's own outermost view, which is the
    // only placement KeyboardAvoidingView actually works from.
    <KeyboardAvoider
      style={[styles.screen, { backgroundColor: panel.bg, paddingTop: insets.top + space.sm }]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: panel.ghost }]}
        >
          <BackIcon size={22} tint={panel.ink} />
        </Pressable>
        <View style={styles.spacer} />
        <ProgressRing
          value={flowProgress(step)}
          tint={accent}
          track={trackOn(panel)}
          label={`${position + 1}/${onboardingFlow.length}`}
          labelColor={panel.ink}
        />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.pipRow}>
          <View style={[styles.pipHalo, { backgroundColor: panel.ghost }]}>
            <FloatingPip>
              <PipMascot size={52} expression={thinking ? 'think' : 'idle'} />
            </FloatingPip>
          </View>
          <Text variant="caption" style={[styles.pipAside, { color: panel.ink2 }]}>
            {pipAside}
          </Text>
        </View>

        <Text variant="display" style={[styles.question, { color: panel.ink }]}>
          {question}
        </Text>
        <Text variant="caption" style={[styles.aside, { color: panel.ink2 }]}>
          {aside}
        </Text>

        {children}
      </ScrollView>

      {onContinue ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.base }]}>
          <Button
            label={continueLabel}
            onPress={onContinue}
            disabled={!canContinue}
            // On the brand panel the fill inverts: a brand button on brand is
            // invisible, so the CTA becomes white with brand text.
            variant={panel.onDark ? 'inverse' : 'primary'}
            testID="onboarding-continue"
          />
        </View>
      ) : null}
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.base,
    paddingBottom: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: space.base,
    paddingTop: space.sm,
    paddingBottom: space.xl,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  pipRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.base },
  pipHalo: {
    width: 62,
    height: 62,
    flexShrink: 0,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipAside: { flex: 1, minWidth: 0, lineHeight: 19 },
  question: { fontSize: 31, lineHeight: 37, letterSpacing: -0.8 },
  aside: { marginTop: space.sm, marginBottom: space.lg, lineHeight: 20 },
  footer: {
    paddingHorizontal: space.base,
    paddingTop: space.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
});
