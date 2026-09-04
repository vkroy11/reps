import {
  GATE_EVERY,
  capstoneOf,
  clearedStages,
  gateSize,
  stageCount,
  type LearningPath,
} from '@reps/core';
import { Card, ProgressRing, Text, color, radius, space } from '@reps/ui';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { Pressable, StyleSheet, View } from 'react-native';

export interface NextGateCardProps {
  path: LearningPath;
  onOpenPath: () => void;
}

/**
 * How close the next gate is, and what is behind it.
 *
 * The ring counts techniques *within the current stage*, not progress through
 * the whole path, because the gate is the thing about to happen. A learner two
 * away from a badge should see two, not "58% of the way through guitar".
 *
 * The gate is named after its capstone technique, so the reward is a thing the
 * learner recognises rather than "Stage 2".
 */
export function NextGateCard({ path, onOpenPath }: NextGateCardProps) {
  const done = path.techniques.filter((technique) => technique.status === 'completed').length;
  const total = path.techniques.length;
  const stages = stageCount(total);
  const cleared = clearedStages(done, total);

  if (cleared >= stages) return null;

  // Stages are 1-indexed here, as in capstoneOf: the gate being worked toward
  // is the one after the last one cleared.
  const stage = cleared + 1;
  const size = gateSize(total, stage);
  const within = done - cleared * GATE_EVERY;
  const remaining = size - within;
  const capstone = capstoneOf(path.techniques, stage);

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Next gate: ${capstone?.title ?? `stage ${stage}`}. ${within} of ${size} techniques cleared. Open the path.`}
        onPress={onOpenPath}
        style={styles.row}
        testID="next-gate"
      >
        <ProgressRing
          value={within / size}
          size={46}
          strokeWidth={4}
          track={color.surfaceLocked}
          label={`${within}/${size}`}
        />

        <View style={styles.copy}>
          <Text variant="label" numberOfLines={2}>
            {capstone?.title ?? `Gate ${stage} of ${stages}`}
          </Text>
          <Text variant="caption" tone="textSecondary" style={styles.line}>
            {remaining} more {remaining === 1 ? 'technique' : 'techniques'} and the gate opens —
            badge, and the next stage unlocks.
          </Text>
        </View>

        <View style={styles.jump}>
          <ArrowRight size={19} color={color.brandPressed} strokeWidth={2.4} />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md + 1 },
  copy: { flex: 1, minWidth: 0 },
  line: { marginTop: 2 },
  jump: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
