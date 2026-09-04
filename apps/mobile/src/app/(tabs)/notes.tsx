import { formatTimestamp } from '@reps/client';
import type { NoteWithContext } from '@reps/core';
import { Button, Card, PipLogo, Skeleton, Text, color, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotebook } from '../../features/notes/useNotes';

interface TechniqueGroup {
  techniqueId: string;
  techniqueTitle: string;
  skill: string;
  notes: NoteWithContext[];
}

/**
 * Every note the learner has written, grouped by the technique it belongs to.
 *
 * The API returns notes newest-first as a flat list; grouping happens here
 * because it is a presentation choice, and because the first-seen order of the
 * flat list already puts the most recently annotated technique at the top -
 * which is the one you are most likely looking for.
 */
export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notes, error, loading, reload } = useNotebook();

  const groups = useMemo(() => groupByTechnique(notes), [notes]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xxl },
      ]}
    >
      <Text variant="title">Notebook</Text>
      {notes.length > 0 ? (
        <Text variant="caption" tone="textSecondary" style={styles.count}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'} across {groups.length}{' '}
          {groups.length === 1 ? 'technique' : 'techniques'}
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <Skeleton height={16} width="40%" />
          <Skeleton height={72} delay={80} />
          <Skeleton height={72} delay={160} />
        </View>
      ) : null}

      {error ? (
        <Card style={styles.block}>
          <Text variant="heading">Couldn’t load your notes</Text>
          <Text variant="body" tone="textSecondary" style={styles.gap}>
            {error.code === 'NetworkError'
              ? 'Check that the API is running and you’re on the same network.'
              : error.message}
          </Text>
          <Button label="Try again" variant="secondary" onPress={reload} />
        </Card>
      ) : null}

      {!loading && !error && notes.length === 0 ? (
        <View style={styles.empty}>
          <PipLogo size={88} />
          <Text variant="body" tone="textSecondary" center>
            Notes you take while practising show up here, grouped by technique — with the video
            timestamp they belong to.
          </Text>
          <Text variant="caption" tone="textSecondary" center>
            Open a technique and tap “Add a note here” while the video plays.
          </Text>
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.techniqueId} style={styles.group}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${group.techniqueTitle}`}
            onPress={() => router.push(`/technique/${group.techniqueId}`)}
            style={styles.groupHead}
          >
            {/* Skill above the title, stacked - a side-by-side label squashes
                titles once the skill is a sentence like "learn concurrency". */}
            <Text variant="overline" tone="textSecondary" numberOfLines={1}>
              {group.skill}
            </Text>
            <Text variant="label" numberOfLines={2}>
              {group.techniqueTitle}
            </Text>
          </Pressable>

          {group.notes.map((note) => (
            <NotebookRow
              key={note.id}
              note={note}
              onPress={() => router.push(`/technique/${note.techniqueId}`)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function NotebookRow({ note, onPress }: { note: NoteWithContext; onPress: () => void }) {
  const stamp = note.timestampSec === null ? null : formatTimestamp(note.timestampSec);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        stamp === null
          ? `Note: ${note.body}. Open the technique.`
          : `Note at ${stamp}: ${note.body}. Open the technique.`
      }
      onPress={onPress}
      style={styles.row}
      testID={`notebook-note-${note.id}`}
    >
      {stamp !== null ? (
        <Text variant="caption" tone="brand" style={styles.stamp}>
          {stamp}
        </Text>
      ) : null}
      <Text variant="body">{note.body}</Text>
    </Pressable>
  );
}

/** Preserves the order techniques were first seen in, which is recency. */
function groupByTechnique(notes: NoteWithContext[]): TechniqueGroup[] {
  const groups: TechniqueGroup[] = [];
  const byId = new Map<string, TechniqueGroup>();

  for (const note of notes) {
    let group = byId.get(note.techniqueId);

    if (!group) {
      group = {
        techniqueId: note.techniqueId,
        techniqueTitle: note.techniqueTitle,
        skill: note.skill,
        notes: [],
      };
      byId.set(note.techniqueId, group);
      groups.push(group);
    }

    group.notes.push(note);
  }

  return groups;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  content: {
    paddingHorizontal: space.base,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  count: { marginTop: space.xs },
  loading: { gap: space.md, marginTop: space.base },
  block: { marginTop: space.base },
  gap: { marginTop: space.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.base },
  group: { marginTop: space.lg },
  groupHead: { gap: 2, paddingBottom: space.sm },
  row: {
    gap: 2,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: color.borderDefault,
  },
  stamp: { marginBottom: 2 },
});
