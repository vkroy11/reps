import { formatTimestamp } from '@reps/client';
import { ActionSheet, Button, Text, color, radius, space, typeScale } from '@reps/ui';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

export interface NoteComposerProps {
  visible: boolean;
  /** Null when the note is about the technique rather than a moment in a video. */
  timestampSec: number | null;
  initialBody?: string;
  onSubmit: (body: string) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Writes or edits a note.
 *
 * The timestamp is captured when the sheet opens and shown as a fact, not an
 * editable field: the useful anchor is where you were when the thought
 * occurred, and the video keeps playing behind the sheet.
 */
export function NoteComposer({
  visible,
  timestampSec,
  initialBody = '',
  onSubmit,
  onClose,
}: NoteComposerProps) {
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setBody(initialBody);
  }, [visible, initialBody]);

  const trimmed = body.trim();

  const submit = async () => {
    if (trimmed.length === 0 || saving) return;

    setSaving(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ActionSheet visible={visible} onClose={onClose} accessibilityLabel="Write a note">
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="heading">{initialBody ? 'Edit note' : 'Note'}</Text>
          {timestampSec !== null ? (
            <View style={styles.stamp}>
              <Text variant="caption" tone="brandPressed">
                at {formatTimestamp(timestampSec)}
              </Text>
            </View>
          ) : null}
        </View>

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What did you notice?"
          placeholderTextColor={color.iconDecorative}
          autoFocus
          multiline
          maxLength={2000}
          accessibilityLabel="Note text"
          style={styles.input}
          testID="note-input"
        />

        <View style={styles.actions}>
          <Button
            label={saving ? 'Saving…' : 'Save note'}
            onPress={submit}
            disabled={trimmed.length === 0 || saving}
            testID="save-note"
          />
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stamp: {
    backgroundColor: color.brandSoft,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  input: {
    ...typeScale.body,
    color: color.textPrimary,
    backgroundColor: color.surfacePage,
    borderWidth: 2,
    borderColor: color.brand,
    borderRadius: radius.input,
    padding: space.base,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  actions: { gap: space.sm },
});
