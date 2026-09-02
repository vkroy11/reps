import { pathProgress } from '@reps/client';
import type { LearningPathSummary } from '@reps/core';
import { Card, ProgressBar, Text, color, radius, space } from '@reps/ui';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PathSwitcherProps {
  visible: boolean;
  paths: LearningPathSummary[];
  focusedId: string | null;
  onSelect: (pathId: string) => void;
  onStartNew: () => void;
  onClose: () => void;
}

/**
 * Switches which hobby Today shows.
 *
 * A plain Modal with a bottom-anchored sheet rather than a gesture library:
 * this is a four-row list that opens and closes, and a dependency-free version
 * behaves identically on iOS, Android and web. The gesture-driven sheet earns
 * its keep on the technique actions, where dragging is part of the interaction.
 */
export function PathSwitcher({
  visible,
  paths,
  focusedId,
  onSelect,
  onStartNew,
  onClose,
}: PathSwitcherProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.base }]}>
        <View style={styles.grab} />
        <Text variant="overline" tone="textSecondary" style={styles.title}>
          What you’re learning
        </Text>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {paths.map((path) => {
            const selected = path.id === focusedId;

            return (
              <Pressable
                key={path.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelect(path.id)}
                testID={`switch-${path.id}`}
              >
                <Card tone={selected ? 'brand' : 'default'} style={styles.row}>
                  <View style={styles.rowHead}>
                    <Text variant="label" tone={selected ? 'brandPressed' : 'textPrimary'}>
                      {path.skill}
                    </Text>
                    <Text variant="caption" tone="textSecondary">
                      {path.completedCount}/{path.techniqueCount}
                    </Text>
                  </View>
                  <Text variant="caption" tone="textSecondary" numberOfLines={1}>
                    {path.goal}
                  </Text>
                  <View style={styles.bar}>
                    <ProgressBar value={pathProgress(path)} height={6} />
                  </View>
                </Card>
              </Pressable>
            );
          })}

          <Pressable accessibilityRole="button" onPress={onStartNew} testID="start-new">
            <Card style={styles.newRow}>
              <Text variant="label" tone="brand">
                + Start something new
              </Text>
            </Card>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.42)' },
  sheet: {
    backgroundColor: color.surfaceCard,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.base,
    paddingTop: space.md,
    maxHeight: '78%',
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: color.borderStrong,
    alignSelf: 'center',
    marginBottom: space.md,
  },
  title: { marginBottom: space.sm },
  list: { flexGrow: 0 },
  listContent: { gap: space.sm, paddingBottom: space.sm },
  row: { gap: space.xs },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  bar: { flexDirection: 'row', marginTop: space.xs },
  newRow: { alignItems: 'center' },
});
