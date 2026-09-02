import type { ContentFormat } from '@reps/core';
import { Card, Chip, Text, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { OnboardingScaffold } from '../../features/onboarding/OnboardingScaffold';
import { useApp } from '../../providers/app-provider';

const FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'video', label: 'Video' },
  { value: 'drill', label: 'Hands-on drills' },
  { value: 'article', label: 'Reading' },
  { value: 'flashcards', label: 'Flashcards' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
];

export default function FormatsScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();
  const [formats, setFormats] = useState<ContentFormat[]>(draft.preferredFormats ?? []);
  const [language, setLanguage] = useState(draft.language ?? 'en');

  const toggle = (value: ContentFormat) =>
    setFormats((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  return (
    <OnboardingScaffold
      step="formats"
      question="How do you like to learn?"
      canContinue
      continueLabel="Build my path"
      onContinue={() => {
        patchDraft({ preferredFormats: formats, language });
        router.push('/generating');
      }}
    >
      <View style={styles.chips}>
        {FORMATS.map((format) => (
          <Chip
            key={format.value}
            label={format.label}
            selected={formats.includes(format.value)}
            onPress={() => toggle(format.value)}
            testID={`format-${format.value}`}
          />
        ))}
      </View>

      {/* Stating the override up front is the feature, not a disclaimer. */}
      <Card tone="brand" style={styles.notice}>
        <Text variant="label" tone="brandPressed" style={styles.noticeText}>
          We’ll follow this where we can — but if a technique needs doing rather than reading, Reps
          will say so and show you a demo instead.
        </Text>
      </Card>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Video language
      </Text>
      <View style={styles.chips}>
        {LANGUAGES.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={language === option.value}
            onPress={() => setLanguage(option.value)}
            testID={`language-${option.value}`}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  notice: { marginTop: space.sm },
  noticeText: { fontSize: 14, lineHeight: 20 },
  label: { marginTop: space.sm },
});
