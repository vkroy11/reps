import { formatTimestamp } from '@reps/client';
import type { Note } from '@reps/core';
import { Text, color, space } from '@reps/ui';
import { Pressable, StyleSheet, View } from 'react-native';

export interface NoteRowProps {
  note: Note;
  /** Provided when the note points into a video that is on screen. */
  onSeek?: (seconds: number) => void;
  onEdit?: (note: Note) => void;
}

/**
 * A note as it appears under a technique.
 *
 * Tapping a timestamped note seeks the player to that moment, which is the
 * whole reason timestamps are stored - the note is a way back into the video,
 * not just a record of it.
 */
export function NoteRow({ note, onSeek, onEdit }: NoteRowProps) {
  const seekable = note.timestampSec !== null && onSeek !== undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        seekable
          ? `Note at ${formatTimestamp(note.timestampSec ?? 0)}: ${note.body}. Jump to this moment.`
          : `Note: ${note.body}`
      }
      onPress={() => {
        if (seekable) onSeek(note.timestampSec ?? 0);
        else onEdit?.(note);
      }}
      onLongPress={() => onEdit?.(note)}
      style={styles.row}
      testID={`note-${note.id}`}
    >
      <View style={styles.stampColumn}>
        {note.timestampSec !== null ? (
          <Text variant="caption" tone="brand">
            {formatTimestamp(note.timestampSec)}
          </Text>
        ) : (
          <Text variant="caption" tone="iconDecorative">
            —
          </Text>
        )}
      </View>
      <Text variant="body" style={styles.body}>
        {note.body}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.borderDefault,
    alignItems: 'flex-start',
  },
  stampColumn: { width: 46, flexShrink: 0, paddingTop: 2 },
  body: { flex: 1, minWidth: 0 },
});
