import type { WeekDay, WeekStats } from '@reps/core';
import { Card, Text, color, radius, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** Bar heights, in points, between a placeholder and a full column. */
const BAR_EMPTY = 6;
const BAR_MIN = 12;
const BAR_MAX = 66;

function barColor(day: WeekDay): string {
  if (day.minutes === 0) return color.surfaceLocked;

  return day.status === 'done' ? color.progress : color.streak;
}

export interface WeekChartProps {
  week: WeekDay[];
  stats: WeekStats;
  /** The daily target a full-height bar represents. */
  dailyMinutes: number;
}

/**
 * The last seven days as minutes, with three readings under them.
 *
 * A bar chart and not a second week strip: the strip above says *whether* each
 * day happened, this says *how much*. A day that hit its target is lime, one
 * that fell short is amber, and an empty day gets a stub rather than nothing
 * at all so the row still reads as seven days.
 *
 * Today is outlined rather than filled, so a day still in progress does not
 * look like a day that fell short.
 */
export function WeekChart({ week, stats, dailyMinutes }: WeekChartProps) {
  const target = Math.max(dailyMinutes, 1);

  return (
    <Card>
      <View style={styles.plot} accessibilityLabel="Minutes practised each of the last seven days">
        {week.map((day) => {
          const filled = Math.min(day.minutes / target, 1);
          const height =
            day.minutes === 0 ? BAR_EMPTY : Math.max(BAR_MIN, Math.round(filled * BAR_MAX));

          return (
            <View key={day.day} style={styles.column}>
              <View
                style={[
                  styles.bar,
                  { height, backgroundColor: barColor(day) },
                  day.isToday && styles.barToday,
                ]}
              />
              <Text variant="overline" style={day.isToday ? styles.labelToday : styles.label}>
                {LETTERS[day.weekday]}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.stats}>
        <Stat value={`${stats.sessionsHit}/${stats.targetDays}`} label="Sessions hit" />
        <Stat value={`${stats.avgMinutes} min`} label="Avg session" />
        <Stat value={`${stats.cleared}`} label="Levels cleared" />
      </View>
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="overline" tone="textSecondary" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm - 1, height: 92 },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.sm - 2,
    height: '100%',
  },
  bar: { width: '100%', maxWidth: 24, borderRadius: 7 },
  barToday: { borderWidth: 2, borderStyle: 'dashed', borderColor: color.brand },
  label: { color: color.textSecondary },
  labelToday: { color: color.brand },
  stats: {
    flexDirection: 'row',
    gap: space.base,
    marginTop: space.base,
    paddingTop: space.base,
    borderTopWidth: 1,
    borderTopColor: color.borderDefault,
  },
  stat: { flex: 1 },
  statValue: { fontVariant: ['tabular-nums'] },
  statLabel: { marginTop: 2, letterSpacing: 0.5 },
});

/** Exported for the skeleton, so the placeholder is exactly this tall. */
export const WEEK_CHART_HEIGHT = 92 + space.base * 2 + 1 + 40 + space.base * 2;
export const WEEK_CHART_RADIUS = radius.card;
