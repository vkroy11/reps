import { SUPPORTED_LANGUAGES, type ContentFormat } from '@reps/core';
import { Text, panels, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FormatTile } from '../../features/onboarding/FormatTile';
import { ImmersiveScaffold } from '../../features/onboarding/ImmersiveScaffold';
import { PanelChip } from '../../features/onboarding/PanelChip';
import { useApp } from '../../providers/app-provider';

/** The hint on each tile says what the format *is*, not that it is good. */
const FORMATS: { value: ContentFormat; label: string; hint: string }[] = [
  { value: 'video', label: 'Video', hint: 'Watch someone do it first' },
  { value: 'drill', label: 'Drills', hint: 'Steps you run yourself' },
  { value: 'article', label: 'Reading', hint: 'Short written explainers' },
  { value: 'flashcards', label: 'Cards', hint: 'For anything recall-based' },
];

export default function FormatsScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();
  const [formats, setFormats] = useState<ContentFormat[]>(draft.preferredFormats ?? []);
  const [language, setLanguage] = useState(draft.language ?? 'en');

  const panel = panels.formats;

  const toggle = (value: ContentFormat) =>
    setFormats((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  return (
    <ImmersiveScaffold
      step="formats"
      question="How do you like to learn?"
      aside="A preference, not a rule. Reps overrides it when a technique needs doing."
      pipAside="Pick as many as you like. You can change these later."
      // Genuinely optional: an empty answer means "no preference", which the
      // planner handles, so there is nothing to block on.
      canContinue
      continueLabel="Build my path"
      onContinue={() => {
        patchDraft({ preferredFormats: formats, language });
        router.replace('/generating');
      }}
    >
      <View style={styles.grid}>
        {FORMATS.map((format) => (
          <FormatTile
            key={format.value}
            label={format.label}
            hint={format.hint}
            format={format.value}
            panel={panel}
            selected={formats.includes(format.value)}
            onPress={() => toggle(format.value)}
            testID={`format-${format.value}`}
          />
        ))}
      </View>

      {/*
        Stated here rather than after the path is built, because this is the
        moment the expectation is set. The override is the product's whole
        argument about format-versus-skill mismatch, so it should not arrive as
        a surprise on a technique screen.
      */}
      <View style={[styles.note, { backgroundColor: panel.ghost }]}>
        <Text variant="caption" style={{ color: panel.ink2 }}>
          We follow this where we can. If a technique needs doing rather than reading, Reps says so
          and shows you a demo instead.
        </Text>
      </View>

      <Text variant="overline" style={[styles.label, { color: panel.ink2 }]}>
        Language
      </Text>
      <View style={styles.chips}>
        {SUPPORTED_LANGUAGES.map((option) => (
          <PanelChip
            key={option.code}
            label={option.label}
            panel={panel}
            selected={language === option.code}
            onPress={() => setLanguage(option.code)}
            testID={`language-${option.code}`}
          />
        ))}
      </View>
    </ImmersiveScaffold>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  note: { marginTop: space.base, padding: space.base, borderRadius: 16 },
  label: { marginTop: space.lg, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
