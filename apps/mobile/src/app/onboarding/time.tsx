import { stepAfter } from '@reps/client';
import { Text, accentOn, panels, radius, space, typeScale } from '@reps/ui';
import { useRouter } from 'expo-router';
import Clock from 'lucide-react-native/icons/clock';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DayRow } from '../../features/onboarding/DayRow';
import { ImmersiveScaffold } from '../../features/onboarding/ImmersiveScaffold';
import { MinutesSlider } from '../../features/onboarding/MinutesSlider';
import { useApp } from '../../providers/app-provider';

const DEFAULT_MINUTES = 20;
const DEFAULT_DAYS = 5;

export default function TimeScreen() {
  const router = useRouter();
  const { draft, patchDraft } = useApp();
  const [dailyMinutes, setDailyMinutes] = useState(draft.dailyMinutes ?? DEFAULT_MINUTES);
  const [daysPerWeek, setDaysPerWeek] = useState(draft.daysPerWeek ?? DEFAULT_DAYS);

  const panel = panels.time;

  return (
    <ImmersiveScaffold
      step="time"
      question="How much time can you give it?"
      aside="This sets how big each session is, not just a number on a screen."
      pipAside="Small and repeatable wins over ambitious and skipped."
      canContinue
      onContinue={() => {
        patchDraft({ dailyMinutes, daysPerWeek });
        router.push(`/onboarding/${stepAfter('time')}`);
      }}
    >
      {/*
        A slider rather than four chips. Chips make the app's four opinions the
        only answers; a continuous control lets someone say 35 and shows the
        number growing as they drag, which is the feedback the question wants.
      */}
      <View style={[styles.card, { backgroundColor: panel.tile }]}>
        <Text variant="overline" style={{ color: panel.ink2 }}>
          Minutes a day
        </Text>
        <Text style={[styles.reading, { color: panel.ink }]}>{dailyMinutes}</Text>
        <MinutesSlider value={dailyMinutes} onChange={setDailyMinutes} panel={panel} />
        <View style={styles.scale}>
          <Text variant="caption" style={{ color: panel.ink2 }}>
            5
          </Text>
          <Text variant="caption" style={{ color: panel.ink2 }}>
            60
          </Text>
        </View>
      </View>

      <Text variant="overline" style={[styles.label, { color: panel.ink2 }]}>
        Days a week
      </Text>
      <DayRow value={daysPerWeek} onChange={setDaysPerWeek} panel={panel} />

      {/* States the consequence of both answers together, which neither
          control can show on its own. */}
      <View style={[styles.preview, { backgroundColor: panel.tile }]}>
        <Clock size={22} color={accentOn(panel)} strokeWidth={2.4} />
        <Text variant="label" style={[styles.previewCopy, { color: panel.ink }]}>
          {describeWeek(dailyMinutes, daysPerWeek)}
        </Text>
      </View>
    </ImmersiveScaffold>
  );
}

/**
 * Weekly minutes, not a path length. The number of techniques is not known
 * until the planner has run, so promising "6 techniques in 4 weeks" here would
 * be a guess presented as a plan.
 */
function describeWeek(minutes: number, days: number): string {
  const weekly = minutes * days;
  const hours = Math.floor(weekly / 60);
  const rest = weekly % 60;
  const total = hours === 0 ? `${rest} min` : rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;

  return `${days} sessions of ${minutes} min — ${total} a week`;
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 22, alignItems: 'center' },
  reading: {
    ...typeScale.display,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -1.9,
    marginTop: space.xs,
    fontVariant: ['tabular-nums'],
  },
  scale: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  label: { marginTop: space.lg, marginBottom: space.sm },
  preview: {
    marginTop: space.lg,
    padding: space.base,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  previewCopy: { flex: 1, minWidth: 0, lineHeight: 20 },
});
