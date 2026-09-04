import { PipLogo, Text, color, radius, space } from '@reps/ui';
import Flame from 'lucide-react-native/icons/flame';
import { StyleSheet, View } from 'react-native';

export interface TodayHeaderProps {
  /** Rendered as-is; see `todayLabel`. */
  dateLabel: string;
  streak: number;
}

/**
 * Pip on the left, the date in the middle, the streak on the right.
 *
 * The date is centred and the streak sits in a pill on the card colour rather
 * than in brand or amber. Only one thing on this screen should be shouting,
 * and it is the hero's call to action - a streak is a fact, not an instruction.
 */
export function TodayHeader({ dateLabel, streak }: TodayHeaderProps) {
  return (
    <View style={styles.row}>
      <PipLogo size={28} />
      <Text variant="label" center style={styles.date}>
        {dateLabel}
      </Text>
      <View
        style={styles.pill}
        accessibilityLabel={streak === 0 ? 'No streak yet' : `${streak} day streak`}
      >
        <Flame size={13} color={color.streak} strokeWidth={2.4} />
        <Text variant="caption" style={styles.streak}>
          {streak}
        </Text>
      </View>
    </View>
  );
}

/**
 * "Friday, 5 September" - weekday first, because that is what a learner
 * checking in wants to know, and no year, because they know what year it is.
 */
export function todayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.base,
    paddingBottom: space.sm,
  },
  date: { flex: 1, minWidth: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 28,
    paddingHorizontal: space.md - 2,
    borderRadius: radius.full,
    backgroundColor: color.surfaceCard,
    borderWidth: 1,
    borderColor: color.borderDefault,
  },
  /* streakText, not streak: the amber fill measures 2.15 as text. */
  streak: { color: color.streakText },
});
