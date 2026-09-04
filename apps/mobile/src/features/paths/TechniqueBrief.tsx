import type { Technique } from '@reps/core';
import { Button, Text, color, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';

export interface TechniqueBriefProps {
  technique: Technique;
  /** The technique that has to be finished before a locked one opens. */
  blockedBy: Technique | null;
  onStart: (techniqueId: string) => void;
  /** Omitted in the wide layout, where the pane is always on screen. */
  onClose?: () => void;
}

/**
 * What a path node says about itself: where it sits, why it matters, and what
 * you can do with it.
 *
 * Extracted from the bottom sheet so the same content can be a sheet on a
 * phone and a persistent right-hand pane on a wide window. The pattern
 * decision lives in the caller; this only knows what to say.
 */
export function TechniqueBrief({
  technique,
  blockedBy,
  onStart,
  onClose,
}: TechniqueBriefProps) {
  const locked = technique.status === 'locked';
  const skipped = technique.status === 'skipped';
  const done = technique.status === 'completed';

  return (
    <View style={styles.body}>
      <Text variant="overline" tone="textSecondary">
        Level {technique.order + 1} · {technique.modality.replace(/_/g, ' ')} ·{' '}
        {technique.estimatedMinutes} min
      </Text>

      <Text variant="title">{technique.title}</Text>
      <Text variant="body" tone="textSecondary">
        {technique.whyItMatters}
      </Text>

      {/* A locked node explains itself rather than doing nothing: a tap with no
          response reads as a broken app, and "what unlocks this" is genuinely
          useful information about the path's ordering. */}
      {locked ? (
        <View style={styles.notice}>
          <Text variant="caption" tone="textSecondary">
            {blockedBy
              ? `Opens once you finish ${blockedBy.title}. The order matters — each technique assumes the one before it.`
              : 'Opens once the technique before it is done.'}
          </Text>
        </View>
      ) : null}

      {skipped ? (
        <View style={styles.notice}>
          <Text variant="caption" tone="textSecondary">
            You removed this one. It stays on the path as a record, and the techniques after it were
            rebuilt without it.
          </Text>
        </View>
      ) : null}

      {technique.resources.length > 0 && !locked ? (
        <Text variant="caption" tone="textSecondary" numberOfLines={2}>
          Starts with: {technique.resources[0]?.title}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {!locked && !skipped ? (
          <Button
            label={done ? 'Practise again' : 'Start'}
            onPress={() => onStart(technique.id)}
            testID="sheet-start"
          />
        ) : null}
        {onClose ? <Button label="Close" variant="ghost" onPress={onClose} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.sm },
  notice: {
    backgroundColor: color.surfacePage,
    borderRadius: 12,
    padding: space.md,
    marginTop: space.xs,
  },
  actions: { gap: space.sm, marginTop: space.md },
});
