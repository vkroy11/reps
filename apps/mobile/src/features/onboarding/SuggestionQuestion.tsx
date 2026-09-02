import type { OnboardingStep } from '@reps/client';
import type { OnboardingSuggestions } from '@reps/core';
import { AnswerCard, Button, Card, PipLogo, Skeleton, Text, color, radius, space, typeScale } from '@reps/ui';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { OnboardingScaffold } from './OnboardingScaffold';
import { useSuggestions } from './useSuggestions';

type Option = OnboardingSuggestions['goals'][number];

export interface SuggestionQuestionProps {
  step: OnboardingStep;
  question: string;
  skill: string | undefined;
  /** Which of the two lists this question reads. */
  select: (suggestions: OnboardingSuggestions) => Option[];
  value: string | undefined;
  onSubmit: (answer: string) => void;
  /** Placeholder for the free-text escape hatch. */
  customPlaceholder: string;
}

/**
 * Questions 2 and 3 share this: model-written options, a free-text escape
 * hatch, and honest loading and failure states. Neither question ever shows
 * "Beginner / Intermediate / Advanced" - generic option lists are the tell of
 * a generic product.
 */
export function SuggestionQuestion({
  step,
  question,
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

  const answer = customOpen ? custom.trim() : (selected ?? '');
  const options = data ? select(data) : [];

  return (
    <OnboardingScaffold
      step={step}
      question={question}
      canContinue={answer.length >= 3}
      onContinue={() => onSubmit(answer)}
    >
      {loading ? (
        <>
          <Skeleton height={82} />
          <Skeleton height={82} />
          <Skeleton height={82} />
          <Text variant="caption" tone="textSecondary" center style={styles.waiting}>
            Asking for options that fit {skill ?? 'this skill'}…
          </Text>
        </>
      ) : null}

      {error ? <SuggestionsError message={describe(error.code)} onRetry={retry} /> : null}

      {options.map((option) => (
        <AnswerCard
          key={option.label}
          label={option.label}
          description={option.description}
          selected={!customOpen && selected === option.label}
          onPress={() => {
            setCustomOpen(false);
            setSelected(option.label);
          }}
          testID={`option-${option.label}`}
        />
      ))}

      {data || error ? (
        <AnswerCard
          label="Something else…"
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
          placeholderTextColor={color.iconDecorative}
          autoFocus
          multiline
          accessibilityLabel="Your own answer"
          style={styles.input}
        />
      ) : null}
    </OnboardingScaffold>
  );
}

function SuggestionsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card tone="default" style={styles.error}>
      <View style={styles.errorHead}>
        <PipLogo size={40} expression="struggle" animate={false} />
        <Text variant="heading" style={styles.errorTitle}>
          Couldn’t load suggestions
        </Text>
      </View>
      <Text variant="body" tone="textSecondary">
        {message} You can still type your own answer below.
      </Text>
      <Button label="Try again" variant="secondary" onPress={onRetry} style={styles.retry} />
    </Card>
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
  waiting: { marginTop: space.xs },
  error: { gap: space.sm },
  errorHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  errorTitle: { flex: 1, minWidth: 0 },
  retry: { marginTop: space.xs },
  input: {
    ...typeScale.body,
    color: color.textPrimary,
    backgroundColor: color.surfaceCard,
    borderWidth: 2,
    borderColor: color.brand,
    borderRadius: radius.input,
    padding: space.base,
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
