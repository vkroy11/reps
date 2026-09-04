import {
  fromLocalDay,
  type Confidence,
  type LocalDay,
  type NoteWithContext,
  type PracticeEntry,
} from '@reps/core';
import { Card, Text, color, space } from '@reps/ui';
import X from 'lucide-react-native/icons/x';
import { Pressable, StyleSheet, View } from 'react-native';

/** How the learner said it went, and how that reads at a glance. */
const GRADE: Record<Confidence, { label: string; ink: string; fill: string }> = {
  solid: { label: 'Solid', ink: color.progressText, fill: color.progressSoft },
  getting_there: { label: 'Getting there', ink: color.brandPressed, fill: color.brandSoft },
  struggling: { label: 'Struggling', ink: color.streakText, fill: color.surfaceSunken },
};

export interface DayPanelProps {
  day: LocalDay;
  entries: PracticeEntry[];
  /** Resolves a technique id to its title. Unknown ids fall back gracefully. */
  titleOf: (techniqueId: string) => string | null;
  /** Anything written that day, so the panel says why as well as how much. */
  notes: NoteWithContext[];
  onClose: () => void;
}

/**
 * What actually happened on one day of the week strip.
 *
 * The strip can only say how much; this says what. It exists because "20
 * minutes" three weeks ago tells the learner nothing, while "20 minutes on
 * chord transitions, struggling" is the sentence that explains why the next
 * session felt the way it did.
 *
 * It opens in place rather than as a sheet: it is context for the row above
 * it, and a modal would hide the row it is explaining.
 */
export function DayPanel({ day, entries, titleOf, notes, onClose }: DayPanelProps) {
  const total = entries.reduce((sum, entry) => sum + entry.minutes, 0);

  return (
    <Card style={styles.panel}>
      <View style={styles.head}>
        <Text variant="label" style={styles.title}>
          {heading(day)} · {total} min
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close this day"
          onPress={onClose}
          hitSlop={12}
          testID="day-panel-close"
        >
          <X size={16} color={color.iconDecorative} strokeWidth={2.6} />
        </Pressable>
      </View>

      {entries.map((entry) => {
        const grade = GRADE[entry.confidence];

        return (
          <View key={entry.at} style={styles.entry}>
            <Text variant="caption" numberOfLines={1} style={styles.entryTitle}>
              {titleOf(entry.techniqueId) ?? 'Practice'}
            </Text>
            <Text variant="caption" tone="textSecondary" style={styles.minutes}>
              {entry.minutes} min
            </Text>
            <View style={[styles.grade, { backgroundColor: grade.fill }]}>
              <Text variant="overline" style={{ color: grade.ink }}>
                {grade.label}
              </Text>
            </View>
          </View>
        );
      })}

      {notes.map((note) => (
        <Text key={note.id} variant="caption" tone="textSecondary" style={styles.note}>
          {note.body}
        </Text>
      ))}
    </Card>
  );
}

/** "Today", or the date - relative labels only where they are unambiguous. */
function heading(day: LocalDay): string {
  return fromLocalDay(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' });
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: space.md + 2, marginBottom: space.sm + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, minWidth: 0 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 1, marginTop: space.sm + 2 },
  entryTitle: { flex: 1, minWidth: 0 },
  minutes: { fontVariant: ['tabular-nums'] },
  grade: { paddingVertical: 3, paddingHorizontal: space.sm, borderRadius: 7 },
  /* A rule rather than quote marks: the note is evidence, not dialogue. */
  note: {
    marginTop: space.md,
    paddingLeft: space.md - 1,
    borderLeftWidth: 3,
    borderLeftColor: color.brandSoft,
  },
});
