import { Chip, Text, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { OnboardingScaffold } from '../../features/onboarding/OnboardingScaffold';
import { useApp } from '../../providers/app-provider';

const MINUTES = [10, 20, 30, 45];
const DAYS = [3, 4, 5, 6, 7];

export default function TimeScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();
  const [dailyMinutes, setDailyMinutes] = useState(draft.dailyMinutes);
  const [daysPerWeek, setDaysPerWeek] = useState(draft.daysPerWeek);

  return (
    <OnboardingScaffold
      step="time"
      question="How much time can you give it?"
      canContinue={dailyMinutes !== undefined && daysPerWeek !== undefined}
      onContinue={() => {
        patchDraft({ dailyMinutes, daysPerWeek });
        router.push('/onboarding/formats');
      }}
    >
      <Text variant="body" tone="textSecondary">
        This sets how big each session is — not just a number on a screen.
      </Text>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Minutes a day
      </Text>
      <View style={styles.chips}>
        {MINUTES.map((minutes) => (
          <Chip
            key={minutes}
            label={minutes === 45 ? '45+' : `${minutes}`}
            selected={dailyMinutes === minutes}
            onPress={() => setDailyMinutes(minutes)}
            testID={`minutes-${minutes}`}
          />
        ))}
      </View>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Days a week
      </Text>
      <View style={styles.chips}>
        {DAYS.map((days) => (
          <Chip
            key={days}
            label={`${days}`}
            selected={daysPerWeek === days}
            onPress={() => setDaysPerWeek(days)}
            testID={`days-${days}`}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
