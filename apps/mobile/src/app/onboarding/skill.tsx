import { stepAfter } from '@reps/client';
import { accentOn, panels, radius, space, typeScale } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { CyclingExamples } from '../../features/onboarding/CyclingExamples';
import { ImmersiveScaffold } from '../../features/onboarding/ImmersiveScaffold';
import { PanelChip } from '../../features/onboarding/PanelChip';
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

export default function SkillScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();
  const [skill, setSkill] = useState(draft.skill ?? '');

  const panel = panels.skill;
  const trimmed = skill.trim();

  return (
    <ImmersiveScaffold
      step="skill"
      question="What do you want to get good at?"
      aside="One hobby at a time. You can add another path later."
      pipAside="One skill. Reps builds the rest around it."
      canContinue={trimmed.length >= 2}
      onContinue={() => {
        // Changing the skill invalidates the answers derived from it.
        const changedSkill = trimmed.toLowerCase() !== (draft.skill ?? '').toLowerCase();
        patchDraft(
          changedSkill ? { skill: trimmed, goal: undefined, level: undefined } : { skill: trimmed },
        );
        router.push(`/onboarding/${stepAfter('skill')}`);
      }}
    >
      {/*
        An underline rather than a boxed field. On a saturated panel a bordered
        white box reads as a card sitting on the colour; an underline keeps the
        answer part of the panel, which is the point of the full-bleed step.
      */}
      <TextInput
        value={skill}
        onChangeText={setSkill}
        placeholder="Guitar"
        placeholderTextColor={panel.ink2}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        accessibilityLabel="The skill you want to get good at"
        style={[styles.input, { color: panel.ink, borderBottomColor: accentOn(panel) }]}
        testID="skill-input"
      />

      <CyclingExamples color={panel.ink2} />

      <View style={styles.chips}>
        {POPULAR.map((item) => (
          <PanelChip
            key={item}
            label={item}
            panel={panel}
            selected={trimmed.toLowerCase() === item.toLowerCase()}
            onPress={() => setSkill(item)}
            testID={`skill-${item}`}
          />
        ))}
      </View>
    </ImmersiveScaffold>
  );
}

const styles = StyleSheet.create({
  input: {
    ...typeScale.title,
    borderBottomWidth: 3,
    borderRadius: 0,
    paddingHorizontal: 2,
    paddingVertical: space.md,
    minHeight: 58,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
});
