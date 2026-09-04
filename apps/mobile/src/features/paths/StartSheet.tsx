import type { Technique } from '@reps/core';
import { ActionSheet, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';
import { TechniqueBrief } from './TechniqueBrief';

export interface StartSheetProps {
  technique: Technique | null;
  /** The technique that has to be finished before a locked one opens. */
  blockedBy: Technique | null;
  onStart: (techniqueId: string) => void;
  onClose: () => void;
}

/**
 * The phone pattern for a tapped path node: a bottom sheet.
 *
 * On a wide window the same content is a persistent right-hand pane instead -
 * see the Path screen. This file exists only to hold the sheet decision, so
 * there is exactly one place that says "phone gets a sheet".
 */
export function StartSheet({ technique, blockedBy, onStart, onClose }: StartSheetProps) {
  return (
    <ActionSheet
      visible={technique !== null}
      onClose={onClose}
      accessibilityLabel={technique ? `${technique.title} options` : 'Technique options'}
    >
      {technique ? (
        <View style={styles.pad}>
          <TechniqueBrief
            technique={technique}
            blockedBy={blockedBy}
            onStart={onStart}
            onClose={onClose}
          />
        </View>
      ) : null}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  pad: { paddingBottom: space.lg },
});
