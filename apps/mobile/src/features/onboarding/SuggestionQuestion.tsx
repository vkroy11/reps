import type { OnboardingStep } from '@reps/client';
import type { OnboardingSuggestions } from '@reps/core';
import {
  Button,
  PipMascot,
  Text,
  accentOn,
  motion,
  panels,
  radius,
  space,
  typeScale,
  type PanelKey,
} from '@reps/ui';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ImmersiveScaffold } from './ImmersiveScaffold';
import { LoadingSuggestions } from './LoadingSuggestions';
import { PanelAnswerCard } from './PanelAnswerCard';
import { useSuggestions } from './useSuggestions';

type Option = OnboardingSuggestions['goals'][number];

export interface SuggestionQuestionProps {
  step: OnboardingStep & PanelKey;
  question: string;
  aside: string;
  pipAside: string;
  skill: string | undefined;
  /** Which of the two lists this question reads. */
  select: (suggestions: OnboardingSuggestions) => Option[];
  value: string | undefined;
  onSubmit: (answer: string) => void;
  /** Placeholder for the free-text escape hatch. */
  customPlaceholder: string;
}

/** Minimum for a free-text answer to be worth sending to the planner. */
const MIN_ANSWER = 3;

/**
 * Questions 2 and 3 share this: model-written options, a free-text escape
 * hatch, and honest loading and failure states. Neither ever shows
 * "Beginner / Intermediate / Advanced" - a generic option list is the tell of a
 * generic product, and the brief calls out exactly that mismatch.
 *
 * Tapping an option advances the flow by itself after a beat, so a five-answer
 * form costs five taps rather than ten. The escape hatch is the exception: it
 * opens a field and waits for the CTA, because there is nothing to auto-advance
 * from until something is typed.
 */
export function SuggestionQuestion({
  step,
  question,
  aside,
  pipAside,
  skill,
  select,
  value,
  onSubmit,
  customPlaceholder,
}: SuggestionQuestionProps) {
  const { data, error, loading, retry } = useSuggestions(skill);
  const [selected, setSelected] = useState<string | undefined>(value);
  const [custom, setCustom] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panel = panels[step];
  const answer = customOpen ? custom.trim() : (selected ?? '');
  const options = data ? select(data) : [];

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  /**
   * Advances itself after a beat. The delay is not decoration: the tick has to
   * be seen landing on the chosen card, or the screen appears to change for no
   * reason and the learner cannot tell what they just answered.
   *
   * Kept under Reduce Motion, unlike the animations around it. The tick still
   * appears there, it simply appears instantly - and needing time to perceive a
   * state change is not a motion preference. Removing the pause would make this
   * screen *harder* to follow for the people that setting is for.
   *
   * Tapping a second card inside the window replaces the pending advance, so
   * the answer that navigates is always the last one touched.
   */
  const pick = (label: string) => {
    setCustomOpen(false);
    setSelected(label);

    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => onSubmit(label), motion.autoAdvance);
  };

  return (
    <ImmersiveScaffold
      step={step}
      question={question}
      aside={aside}
      pipAside={pipAside}
      thinking={loading}
      /*
        No CTA until the free-text field is open. Tapping a suggestion advances
        by itself, so a Continue button sitting there greyed out for the whole
        step would only ever look like something the learner had failed to do.
      */
      canContinue={answer.length >= MIN_ANSWER}
      onContinue={customOpen ? () => onSubmit(answer) : undefined}
    >
      {loading ? <LoadingSuggestions panel={panel} skill={skill} /> : null}

      {error ? (
        <SuggestionsError panelKey={step} message={describe(error.code)} onRetry={retry} />
      ) : null}

      <View style={styles.list}>
        {options.map((option, index) => (
          <PanelAnswerCard
            key={option.label}
            label={option.label}
            description={option.description}
            badge={`${index + 1}`}
            panel={panel}
            index={index}
            selected={!customOpen && selected === option.label}
            onPress={() => pick(option.label)}
            testID={`option-${option.label}`}
          />
        ))}

        {/*
          Always offered once the options resolve, and offered on failure too.
          The three suggestions are a shortcut, not the vocabulary - somebody
          whose goal is not on the list must still be able to state it, or the
          model's guess silently becomes the product's limit.
        */}
        {data || error ? (
          <PanelAnswerCard
            label="Something else…"
            description="Say it in your own words."
            badge="+"
            panel={panel}
            index={options.length}
            selected={customOpen}
            onPress={() => setCustomOpen(true)}
            testID="option-custom"
          />
        ) : null}

        {customOpen ? (
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder={customPlaceholder}
            placeholderTextColor={panel.ink2}
            autoFocus
            multiline
            maxLength={200}
            accessibilityLabel="Your own answer"
            style={[
              styles.input,
              { color: panel.ink, backgroundColor: panel.tile, borderColor: accentOn(panel) },
            ]}
            testID="custom-answer"
          />
        ) : null}

        {data && !customOpen ? (
          <Text variant="caption" center style={[styles.hint, { color: panel.ink2 }]}>
            Tap one — it moves on by itself
          </Text>
        ) : null}
      </View>
    </ImmersiveScaffold>
  );
}

function SuggestionsError({
  panelKey,
  message,
  onRetry,
}: {
  panelKey: PanelKey;
  message: string;
  onRetry: () => void;
}) {
  const panel = panels[panelKey];

  return (
    <View style={[styles.error, { backgroundColor: panel.tile }]}>
      <View style={styles.errorHead}>
        <PipMascot size={40} expression="struggle" />
        <Text variant="heading" style={[styles.errorTitle, { color: panel.ink }]}>
          Couldn’t load suggestions
        </Text>
      </View>
      <Text variant="caption" style={{ color: panel.ink2 }}>
        {message} You can still type your own answer.
      </Text>
      <Button label="Try again" variant="secondary" onPress={onRetry} style={styles.retry} />
    </View>
  );
}

function describe(code: string): string {
  switch (code) {
    case 'NetworkError':
      return 'We can’t reach Reps right now — check your connection.';
    case 'RateLimited':
      return 'The model is busy for a moment.';
    case 'QuotaExhausted':
      return 'Today’s model quota is spent.';
    default:
      return 'Something went wrong on our side.';
  }
}

const styles = StyleSheet.create({
  list: { gap: 11 },
  hint: { marginTop: space.xs },
  error: { gap: space.sm, padding: space.base, borderRadius: 20 },
  errorHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  errorTitle: { flex: 1, minWidth: 0 },
  retry: { marginTop: space.xs },
  input: {
    ...typeScale.body,
    borderWidth: 2,
    borderRadius: radius.input,
    padding: space.base,
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
