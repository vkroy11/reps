import { formatTimestamp } from '@reps/client';
import type { NoteWithContext } from '@reps/core';
import { Text, color, radius, space } from '@reps/ui';
import CornerDownRight from 'lucide-react-native/icons/corner-down-right';
import FileText from 'lucide-react-native/icons/file-text';
import Play from 'lucide-react-native/icons/play';
import { Pressable, StyleSheet, View } from 'react-native';

export type NoteOrigin = 'video' | 'technique';

export interface NoteCardProps {
  note: NoteWithContext;
  /** 1-based level, so the card can say where in the path this came from. */
  level: number | null;
  onPress: () => void;
}

/**
 * A note with its provenance: what it was taken against, and where tapping it
 * goes back to.
 *
 * The footer line is the important part, and it is a promise. "Jump to 3:42 in
 * the video" has to actually land at 3:42 - a label that names an anchor the
 * destination then ignores is worse than no label, because the learner stops
 * trusting any of them. The anchor is carried through the route, so the
 * technique screen seeks to it on arrival.
 */
export function NoteCard({ note, level, onPress }: NoteCardProps) {
  const origin: NoteOrigin = note.timestampSec === null ? 'technique' : 'video';
  const stamp = note.timestampSec === null ? null : formatTimestamp(note.timestampSec);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${note.body}. ${jumpLabel(origin, stamp)}`}
      onPress={onPress}
      style={styles.card}
      testID={`note-card-${note.id}`}
    >
      <View style={styles.head}>
        <View style={[styles.badge, origin === 'video' ? styles.badgeVideo : styles.badgeNote]}>
          {origin === 'video' ? (
            <Play size={13} color={color.brandPressed} strokeWidth={2.6} fill={color.brandPressed} />
          ) : (
            <FileText size={13} color={color.textSecondary} strokeWidth={2.4} />
          )}
          <Text
            variant="overline"
            style={{ color: origin === 'video' ? color.brandPressed : color.textSecondary }}
          >
            {origin === 'video' ? 'Video' : 'Technique'}
          </Text>
        </View>

        <Text variant="caption" tone="textSecondary" numberOfLines={1} style={styles.context}>
          {level === null ? note.techniqueTitle : `Level ${level} · ${note.techniqueTitle}`}
        </Text>
      </View>

      {stamp !== null ? (
        <View style={styles.anchor}>
          <Text variant="caption" tone="brandPressed">
            at {stamp}
          </Text>
        </View>
      ) : null}

      <Text variant="body" style={styles.body}>
        {note.body}
      </Text>

      <View style={styles.footer}>
        <CornerDownRight size={14} color={color.iconDecorative} strokeWidth={2.4} />
        <Text variant="caption" tone="textSecondary">
          {jumpLabel(origin, stamp)}
        </Text>
      </View>
    </Pressable>
  );
}

function jumpLabel(origin: NoteOrigin, stamp: string | null): string {
  return origin === 'video' && stamp !== null
    ? `Jump to ${stamp} in the video`
    : 'Open the technique';
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.base,
    borderRadius: radius.card,
    backgroundColor: color.surfaceCard,
    borderWidth: 1,
    borderColor: color.borderDefault,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: space.sm,
    borderRadius: radius.chip,
    flexShrink: 0,
  },
  badgeVideo: { backgroundColor: color.brandSoft },
  badgeNote: { backgroundColor: color.surfaceSunken },
  context: { flex: 1, minWidth: 0, textAlign: 'right' },
  anchor: { alignSelf: 'flex-start' },
  body: { lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.borderDefault,
  },
});
