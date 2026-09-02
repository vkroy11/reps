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
 * The value is whatever is actually recorded - currently zero for everyone,
 * because practice sessions are not logged until the reflect step lands in
 * Phase 7. A fabricated streak would train exactly the behaviour the product
 * is trying to avoid, so it stays honest and greys out at zero.
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
