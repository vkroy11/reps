import { Text, color, space } from '@reps/ui';
import Flame from 'lucide-react-native/icons/flame';
import { StyleSheet, View } from 'react-native';

export interface StreakChipProps {
  /** Consecutive days with a recorded practice session. */
  days: number;
}

/**
 * The streak lives in the top right, alone, so the HUD has one number in it.
 *
 * The value is whatever is actually recorded: consecutive local days with a
 * stored practice session, counted from the session rows themselves. A
 * fabricated streak would train exactly the behaviour the product is trying to
 * avoid, so it greys out at zero rather than being softened.
 */
export function StreakChip({ days }: StreakChipProps) {
  const active = days > 0;

  return (
    <View
      accessibilityLabel={
        active ? `${days} day practice streak` : 'No practice streak yet'
      }
      style={styles.chip}
    >
      <Flame
        size={18}
        color={active ? color.streak : color.iconDecorative}
        strokeWidth={2.4}
        fill={active ? color.streak : 'transparent'}
      />
      <Text variant="label" tone={active ? 'streakText' : 'iconDecorative'}>
        {days}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: space.sm },
});
