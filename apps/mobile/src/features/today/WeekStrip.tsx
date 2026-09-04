import type { LocalDay, WeekDay } from '@reps/core';
import { Text, color, radius, space } from '@reps/ui';
import { Pressable, StyleSheet, View } from 'react-native';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** A dot's colour says what happened; transparent says nothing was expected. */
function dotColor(status: WeekDay['status']): string {
  switch (status) {
    case 'done':
      return color.progress;
    case 'partial':
      return color.streak;
    case 'missed':
      return color.borderStrong;
    default:
      return 'transparent';
  }
}

export interface WeekStripProps {
  week: WeekDay[];
  /** Opens that day's sessions. Omit to leave the strip inert. */
  onSelectDay?: (day: LocalDay) => void;
  selectedDay?: LocalDay | null;
}

/**
 * The last seven days, ending today.
 *
 * Ending today rather than running Monday-to-Sunday: what matters is the run
 * you are on, and a calendar week resets that on an arbitrary morning. Today
 * is always the rightmost column, so the streak reads as "the dots next to the
 * one I'm about to fill".
 *
 * A rest day gets no dot at all rather than a grey one - somebody on a
 * five-day plan should not see two failures every weekend.
 */
export function WeekStrip({ week, onSelectDay, selectedDay }: WeekStripProps) {
  return (
    <View style={styles.row} accessibilityLabel="Your last seven days">
      {week.map((day) => (
        <Pressable
          key={day.day}
          // A day with nothing on it has nothing to open, so it stays inert
          // rather than offering a panel that would say "no sessions".
          disabled={!onSelectDay || day.minutes === 0}
          onPress={() => onSelectDay?.(day.day)}
          accessibilityRole={onSelectDay && day.minutes > 0 ? 'button' : undefined}
          accessibilityState={{ selected: day.day === selectedDay }}
          style={[
            styles.column,
            day.isToday && styles.today,
            day.day === selectedDay && styles.selected,
          ]}
          accessibilityLabel={`${LETTERS[day.weekday]}, ${describe(day)}`}
          testID={`week-day-${day.day}`}
        >
          <Text
            variant="overline"
            style={{ color: day.isToday ? color.brand : color.textSecondary }}
          >
            {day.isToday ? 'TODAY' : LETTERS[day.weekday]}
          </Text>
          <View style={[styles.disc, discStyle(day)]}>
            <Text variant="label" style={{ color: discInk(day) }}>
              {day.dayOfMonth}
            </Text>
          </View>
          <View style={[styles.dot, { backgroundColor: dotColor(day.status) }]} />
        </Pressable>
      ))}
    </View>
  );
}

function describe(day: WeekDay): string {
  if (day.status === 'done') return `${day.minutes} minutes practised`;
  if (day.status === 'partial') return `${day.minutes} minutes, short of your target`;
  if (day.status === 'rest') return 'rest day';

  return 'no practice';
}

function discStyle(day: WeekDay) {
  if (day.isToday) return { backgroundColor: color.brand };
  if (day.status === 'done' || day.status === 'partial') {
    return { backgroundColor: color.progressSoft };
  }

  return undefined;
}

function discInk(day: WeekDay): string {
  if (day.isToday) return color.textOnBrand;
  if (day.status === 'done' || day.status === 'partial') return color.progressText;

  return color.textPrimary;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: space.sm,
    borderRadius: radius.chip,
  },
  today: { backgroundColor: color.surfaceCard },
  selected: { backgroundColor: color.brandSoft },
  disc: {
    width: 31,
    height: 31,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: radius.full },
});
