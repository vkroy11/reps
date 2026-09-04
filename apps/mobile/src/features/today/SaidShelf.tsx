import { formatTimestamp } from '@reps/client';
import type { NoteWithContext } from '@reps/core';
import { Card, Text, color, space } from '@reps/ui';
import { Pressable, StyleSheet, View } from 'react-native';

export interface SaidShelfProps {
  notes: NoteWithContext[];
  onOpen: (note: NoteWithContext) => void;
}

/**
 * The learner's own words, back in front of them.
 *
 * This is the retention hook the whole notes feature exists for. A note taken
 * three weeks ago and never seen again is a diary; a note that reappears on
 * the home screen is revision. Nothing here is generated - every line is
 * something the learner typed, which is why the heading is "You said".
 *
 * Tapping a note goes back to where it was taken, at the second it was taken,
 * so a half-remembered thought is one tap from its source.
 */
export function SaidShelf({ notes, onOpen }: SaidShelfProps) {
  return (
    <View style={styles.stack}>
      {notes.map((note) => (
        <Pressable
          key={note.id}
          accessibilityRole="button"
          accessibilityLabel={`Your note: ${note.body}. From ${note.techniqueTitle}. Open it.`}
          onPress={() => onOpen(note)}
          testID={`said-${note.id}`}
        >
          <Card>
            <Text variant="body" style={styles.body}>
              {note.body}
            </Text>
            <Text variant="caption" tone="textSecondary" style={styles.meta} numberOfLines={1}>
              {metaLine(note)}
            </Text>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

/** "12 Dec · Chord transitions · 3:42" - when, where, and how far in. */
function metaLine(note: NoteWithContext): string {
  const when = new Date(note.createdAt);
  const parts = [
    Number.isNaN(when.getTime())
      ? null
      : when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    note.techniqueTitle,
    note.timestampSec === null ? null : formatTimestamp(note.timestampSec),
  ];

  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

const styles = StyleSheet.create({
  stack: { gap: space.sm + 1 },
  /* A quote reads as a quote: heavier than caption, with a rule beside it. */
  body: {
    paddingLeft: space.md,
    borderLeftWidth: 3,
    borderLeftColor: color.brandSoft,
  },
  meta: { marginTop: space.sm },
});
