import type { Technique } from '@reps/core';
import { ActionSheet, Button, Text, color, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';

export interface StartSheetProps {
  technique: Technique | null;
  /** The technique that has to be finished before a locked one opens. */
  blockedBy: Technique | null;
  onStart: (techniqueId: string) => void;
  onClose: () => void;
}

/**
 * Opens when a path node is tapped.
 *
 * Locked nodes get an explanation rather than nothing: a tap that does nothing
 * reads as a broken app, and "what unlocks this" is genuinely useful
 * information about the path's ordering.
 */
export function StartSheet({ technique, blockedBy, onStart, onClose }: StartSheetProps) {
  const locked = technique?.status === 'locked';
  const skipped = technique?.status === 'skipped';
  const done = technique?.status === 'completed';

  return (
    <ActionSheet
      visible={technique !== null}
      onClose={onClose}
      accessibilityLabel={technique ? `${technique.title} options` : 'Technique options'}
    >
      {technique ? (
        <View style={styles.body}>
          <Text variant="overline" tone="textSecondary">
            Technique {technique.order + 1} ·{' '}
            {technique.modality.replace(/_/g, ' ')} · {technique.estimatedMinutes} min
          </Text>

          <Text variant="title">{technique.title}</Text>
          <Text variant="body" tone="textSecondary">
            {technique.whyItMatters}
          </Text>

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
                You removed this one. It stays on the path as a record, and the techniques after it
                were rebuilt without it.
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
            <Button label="Close" variant="ghost" onPress={onClose} />
          </View>
        </View>
      ) : null}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.sm, paddingBottom: space.lg },
  notice: {
    backgroundColor: color.surfacePage,
    borderRadius: 12,
    padding: space.md,
    marginTop: space.xs,
  },
  actions: { gap: space.sm, marginTop: space.md },
});
