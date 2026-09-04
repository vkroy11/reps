import { formatTimestamp } from '@reps/client';
import type { ResumePoint } from '@reps/core';
import { Text, color, radius, space } from '@reps/ui';
import Play from 'lucide-react-native/icons/play';
import { Pressable, StyleSheet, View } from 'react-native';

export interface ResumeRowsProps {
  points: ResumePoint[];
  onResume: (point: ResumePoint) => void;
}

/**
 * The exact second the learner left off, with the note they left there.
 *
 * The timestamp on the right is the whole row: tapping it opens the resource
 * and seeks the player, so a 14-minute video the learner is 9 minutes into
 * costs one tap instead of a scrub. The subtitle is their own note rather than
 * the technique name, because the note is what makes the moment recognisable.
 */
export function ResumeRows({ points, onResume }: ResumeRowsProps) {
  return (
    <View style={styles.stack}>
      {points.map((point) => (
        <Pressable
          key={point.resourceId}
          accessibilityRole="button"
          accessibilityLabel={`Resume ${point.techniqueTitle} at ${formatTimestamp(point.atSec)}, where you noted: ${point.body}`}
          onPress={() => onResume(point)}
          style={styles.row}
          testID={`resume-${point.resourceId}`}
        >
          <View style={styles.glyph}>
            <Play size={17} color={color.brand} strokeWidth={2.4} />
          </View>
          <View style={styles.copy}>
            <Text variant="caption" numberOfLines={1}>
              {point.techniqueTitle}
            </Text>
            <Text variant="overline" tone="textSecondary" numberOfLines={1} style={styles.note}>
              {point.body}
            </Text>
          </View>
          <Text variant="caption" style={styles.at}>
            {formatTimestamp(point.atSec)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm + 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.input + 2,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.surfaceCard,
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  note: { marginTop: 2, letterSpacing: 0.3 },
  at: { color: color.brand, fontVariant: ['tabular-nums'] },
});
