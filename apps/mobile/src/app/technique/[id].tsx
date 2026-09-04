import type { Note, TechniqueContent } from '@reps/core';
import { Button, Card, PipMascot, Skeleton, Text, color, space } from '@reps/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoteComposer } from '../../features/notes/NoteComposer';
import { NoteRow } from '../../features/notes/NoteRow';
import { useTechniqueNotes } from '../../features/notes/useNotes';
import { VideoPlayer } from '../../features/player/VideoPlayer';
import { useTechnique, useTechniqueContent } from '../../features/techniques/useTechnique';

/**
 * One technique: why it matters, what to watch, and the rep to perform.
 *
 * Modelled on an exercise screen rather than a lesson page - the moodboard
 * capture of Hevy confirmed the shape, with the demo, the cue and the notes all
 * on the item itself.
 *
 * Phase 6 replaces the resource card with the in-app player and timestamped
 * notes; Phase 7 turns "Start the rep" into the timer and reflect step.
 */
export default function TechniqueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { technique, error, loading, reload } = useTechnique(id ?? null);
  const { content, loading: contentLoading, error: contentError, load } = useTechniqueContent(
    id ?? null,
  );
  const { notes, add, edit } = useTechniqueNotes(id ?? null);

  // Reading the player position through a ref keeps progress out of state, so
  // opening the composer does not re-render the player.
  const readPosition = useRef<(() => number) | null>(null);
  const seekRef = useRef<((seconds: number) => void) | null>(null);
  const [composer, setComposer] = useState<{ timestampSec: number | null; note: Note | null } | null>(
    null,
  );

  const primaryResource = technique?.resources[0] ?? null;

  const registerPositionReader = useCallback((read: () => number) => {
    readPosition.current = read;
  }, []);

  const registerSeek = useCallback((seek: (seconds: number) => void) => {
    seekRef.current = seek;
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <ChevronLeft size={26} color={color.textSecondary} strokeWidth={2.4} />
        </Pressable>
        <Text variant="heading" numberOfLines={1} style={styles.headerTitle}>
          {technique?.title ?? 'Technique'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
      >
        {loading ? (
          <>
            <Skeleton height={18} width="45%" />
            <Skeleton height={80} delay={80} />
            <Skeleton height={180} delay={160} />
          </>
        ) : null}

        {error ? (
          <Card>
            <Text variant="heading">Couldn’t load this technique</Text>
            <Text variant="body" tone="textSecondary" style={styles.gap}>
              {error.code === 'NetworkError'
                ? 'Check that the API is running and you’re on the same network.'
                : error.message}
            </Text>
            <Button label="Try again" variant="secondary" onPress={reload} />
          </Card>
        ) : null}

        {technique ? (
          <>
            <Text variant="overline" tone="textSecondary">
              {technique.modality.replace(/_/g, ' ')} · {technique.estimatedMinutes} min
            </Text>

            <Text variant="overline" tone="textSecondary" style={styles.label}>
              Why this
            </Text>
            <Text variant="body">{technique.whyItMatters}</Text>

            {primaryResource ? (
              <>
                <Text variant="overline" tone="textSecondary" style={styles.label}>
                  Learn
                </Text>
                <VideoPlayer
                  resource={primaryResource}
                  onRegisterPositionReader={registerPositionReader}
                  onRegisterSeek={registerSeek}
                />
                <Text variant="label" numberOfLines={2} style={styles.resourceTitle}>
                  {primaryResource.title}
                </Text>
                <Text variant="caption" tone="textSecondary">
                  {primaryResource.source}
                </Text>
                {/* The one line that justifies this pick over the others. */}
                <Text variant="caption" tone="textSecondary" style={styles.reason}>
                  {primaryResource.selectionReason}
                </Text>

                <Button
                  label="Add a note here"
                  variant="secondary"
                  onPress={() =>
                    setComposer({
                      timestampSec: Math.floor(readPosition.current?.() ?? 0),
                      note: null,
                    })
                  }
                  testID="add-timestamped-note"
                />
              </>
            ) : (
              <Card style={styles.noResource}>
                <Text variant="caption" tone="textSecondary">
                  No video for this one — it’s a {technique.modality.replace(/_/g, ' ')} technique,
                  so the practice below is the lesson.
                </Text>
              </Card>
            )}

            <Text variant="overline" tone="textSecondary" style={styles.label}>
              Practice
            </Text>
            <Card tone="progress">
              <Text variant="body" tone="progressText" style={styles.rep}>
                {technique.practicePrompt}
              </Text>
            </Card>

            {content ? <GeneratedContent content={content} /> : null}

            {contentLoading ? (
              <View style={styles.generating}>
                <PipMascot size={72} expression="think" />
                <Text variant="caption" tone="textSecondary" center>
                  Writing the drill for this technique…
                </Text>
              </View>
            ) : null}

            {contentError ? (
              <Card>
                <Text variant="caption" tone="textSecondary">
                  Couldn’t generate the drill. {contentError.message}
                </Text>
                <Button
                  label="Try again"
                  variant="secondary"
                  onPress={load}
                  style={styles.retry}
                />
              </Card>
            ) : null}

            {!content && !contentLoading && !contentError ? (
              <Button label="Show me the drill" onPress={load} testID="load-drill" />
            ) : null}

            <Text variant="overline" tone="textSecondary" style={styles.label}>
              My notes
            </Text>
            {notes.length === 0 ? (
              <Text variant="caption" tone="textSecondary">
                Nothing yet. Notes you take while watching land here with the moment they belong to.
              </Text>
            ) : (
              notes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  onSeek={primaryResource ? (seconds) => seekRef.current?.(seconds) : undefined}
                  onEdit={(target) =>
                    setComposer({ timestampSec: target.timestampSec, note: target })
                  }
                />
              ))
            )}

            {!primaryResource ? (
              <Button
                label="Add a note"
                variant="secondary"
                onPress={() => setComposer({ timestampSec: null, note: null })}
                style={styles.addNote}
                testID="add-note"
              />
            ) : null}

            <Text variant="caption" tone="textSecondary" center style={styles.soon}>
              The practice timer and the reflect step arrive next.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <NoteComposer
        visible={composer !== null}
        timestampSec={composer?.timestampSec ?? null}
        initialBody={composer?.note?.body ?? ''}
        onClose={() => setComposer(null)}
        onSubmit={async (body) => {
          if (composer?.note) {
            await edit(composer.note.id, body);

            return;
          }

          await add({
            body,
            resourceId: primaryResource?.id ?? null,
            timestampSec: composer?.timestampSec ?? null,
          });
        }}
      />
    </View>
  );
}

function GeneratedContent({ content }: { content: TechniqueContent }) {
  if (content.format === 'drill') {
    return (
      <Card>
        <Text variant="overline" tone="textSecondary">
          The drill · {content.durationMinutes} min
        </Text>
        {content.steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <Text variant="label" tone="brand" style={styles.stepNumber}>
              {index + 1}
            </Text>
            <Text variant="body" style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
        <View style={styles.criteria}>
          <Text variant="caption" tone="progressText">
            Done when: {content.successCriteria}
          </Text>
        </View>
      </Card>
    );
  }

  if (content.format === 'flashcards') {
    return (
      <Card>
        <Text variant="overline" tone="textSecondary">
          {content.cards.length} cards
        </Text>
        <Text variant="body" tone="textSecondary" style={styles.gap}>
          The card deck opens in the flashcard player, which lands with the review step.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="heading">{content.title}</Text>
      <Text variant="body" style={styles.gap}>
        {content.body}
      </Text>
      {content.keyPoints.map((point) => (
        <Text key={point} variant="caption" tone="textSecondary" style={styles.point}>
          • {point}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.base,
    paddingBottom: space.sm,
  },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0 },
  content: {
    paddingHorizontal: space.base,
    gap: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  label: { marginTop: space.base },
  gap: { marginTop: space.sm },
  resourceTitle: { marginTop: space.sm },
  reason: { marginTop: space.xs, marginBottom: space.sm },
  addNote: { marginTop: space.sm },
  noResource: { marginTop: space.xs },
  rep: { fontSize: 15, lineHeight: 21 },
  generating: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  retry: { marginTop: space.sm },
  step: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  stepNumber: { width: 18 },
  stepText: { flex: 1, minWidth: 0 },
  criteria: {
    marginTop: space.base,
    padding: space.md,
    borderRadius: 12,
    backgroundColor: color.progressSoft,
  },
  point: { marginTop: space.xs },
  soon: { marginTop: space.lg },
});
