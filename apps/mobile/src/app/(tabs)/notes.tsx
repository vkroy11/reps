import type { NoteWithContext } from '@reps/core';
import { Button, Card, PipLogo, Skeleton, Text, color, radius, space } from '@reps/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoteCard } from '../../features/notes/NoteCard';
import { useNotebook } from '../../features/notes/useNotes';

type Filter = 'All' | 'Video' | 'Technique';

const FILTERS: Filter[] = ['All', 'Video', 'Technique'];

/**
 * Every note, newest first, each carrying where it came from.
 *
 * Flat and filtered rather than grouped by technique, which is how this screen
 * worked before. Grouping answered "what did I write about barre chords",
 * which the technique screen already answers better. The question this screen
 * is for is "what did I write recently" - and that is chronological.
 *
 * Tapping a note goes back to its origin, seeking the video to the timestamp
 * when there is one. The anchor travels as a route param, so the destination
 * honours the label rather than just landing nearby.
 */
export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notes, error, loading, reload } = useNotebook();
  const [filter, setFilter] = useState<Filter>('All');

  const visible = useMemo(() => notes.filter((note) => matches(note, filter)), [notes, filter]);
  // Level is the technique's position, which the notebook payload does not
  // carry - so it is only shown when two notes from the same technique make
  // the ordering meaningful. Absent rather than guessed.
  const counts = useMemo(() => tally(notes), [notes]);

  const open = (note: NoteWithContext) => {
    router.push(
      note.timestampSec === null
        ? `/technique/${note.techniqueId}`
        : `/technique/${note.techniqueId}?seek=${note.timestampSec}`,
    );
  };

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
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </Text>
      ) : null}

      {notes.length > 0 ? (
        <View style={styles.filters}>
          {FILTERS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === option }}
              onPress={() => setFilter(option)}
              style={[styles.filter, filter === option && styles.filterOn]}
              testID={`filter-${option}`}
            >
              <Text
                variant="caption"
                style={{ color: filter === option ? color.textOnBrand : color.textSecondary }}
              >
                {option}
                {option === 'All' ? '' : ` · ${counts[option]}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <Skeleton height={128} borderRadius={16} />
          <Skeleton height={128} borderRadius={16} delay={80} />
          <Skeleton height={128} borderRadius={16} delay={160} />
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
            Notes you take while practising show up here, each one remembering the moment it came
            from.
          </Text>
          <Text variant="caption" tone="textSecondary" center>
            Open a technique and tap “Add a note here” while the video plays.
          </Text>
        </View>
      ) : null}

      {!loading && notes.length > 0 && visible.length === 0 ? (
        <Text variant="caption" tone="textSecondary" center style={styles.block}>
          No {filter.toLowerCase()} notes yet.
        </Text>
      ) : null}

      <View style={styles.list}>
        {visible.map((note) => (
          <NoteCard key={note.id} note={note} level={null} onPress={() => open(note)} />
        ))}
      </View>
    </ScrollView>
  );
}

function matches(note: NoteWithContext, filter: Filter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Video') return note.timestampSec !== null;

  return note.timestampSec === null;
}

function tally(notes: NoteWithContext[]): Record<Exclude<Filter, 'All'>, number> {
  return {
    Video: notes.filter((note) => note.timestampSec !== null).length,
    Technique: notes.filter((note) => note.timestampSec === null).length,
  };
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
  filters: { flexDirection: 'row', gap: space.sm, marginTop: space.base },
  filter: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    backgroundColor: color.surfaceSunken,
  },
  filterOn: { backgroundColor: color.brand },
  loading: { gap: space.md, marginTop: space.base },
  block: { marginTop: space.base },
  gap: { marginTop: space.sm },
  empty: { alignItems: 'center', gap: space.base, paddingTop: space.xxl },
  list: { gap: space.md, marginTop: space.base },
});
