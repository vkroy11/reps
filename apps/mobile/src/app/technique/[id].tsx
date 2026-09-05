import { formatTimestamp } from '@reps/client';
import type { Note, TechniqueContent } from '@reps/core';
import { Button, Card, PipMascot, Skeleton, Text, color, space } from '@reps/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdaptSheet } from '../../features/techniques/AdaptSheet';
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
  const { id, seek } = useLocalSearchParams<{ id: string; seek?: string }>();

  const { technique, error, loading, reload } = useTechnique(id ?? null);
  const {
    content,
    loading: contentLoading,
    error: contentError,
    load,
  } = useTechniqueContent(id ?? null);
  const { notes, add, edit } = useTechniqueNotes(id ?? null);

  // Reading the player position through a ref keeps progress out of state, so
  // opening the composer does not re-render the player.
  const readPosition = useRef<(() => number) | null>(null);
  const seekRef = useRef<((seconds: number) => void) | null>(null);
  const [composer, setComposer] = useState<{
    timestampSec: number | null;
    note: Note | null;
  } | null>(null);
  const [adapt, setAdapt] = useState<'too_hard' | 'skip' | null>(null);

  const primaryResource = technique?.resources[0] ?? null;

  const registerPositionReader = useCallback((read: () => number) => {
    readPosition.current = read;
  }, []);

  /*
    A note tapped in the notebook arrives with `?seek=222`, and the label that
    sent the learner here said "Jump to 3:42". Honouring it exactly is the
    whole contract: a label naming an anchor the destination ignores teaches
    people to distrust every one of them.

    Applied once, and only after the player has registered its seek function -
    which is why it lands here rather than in an effect that might run first.
  */
  const jumpedRef = useRef(false);
  const jumpTo = seek === undefined ? null : Number.parseInt(seek, 10);

  const registerSeek = useCallback(
    (seeker: (seconds: number) => void) => {
      seekRef.current = seeker;

      if (jumpedRef.current || jumpTo === null || Number.isNaN(jumpTo)) return;

      jumpedRef.current = true;
      seeker(jumpTo);
    },
    [jumpTo],
  );

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

                {jumpTo !== null && !Number.isNaN(jumpTo) ? (
                  <View style={styles.jumped}>
                    <Text variant="caption" tone="textOnBrand">
                      Jumped to your note · {formatTimestamp(jumpTo)}
                    </Text>
                  </View>
                ) : null}

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
                {/*
                  Recall techniques do get a lesson now, so "it's a flashcards
                  technique" is no longer the reason one is missing - it means
                  the search found nothing usable. Saying that plainly beats
                  explaining a rule that no longer applies.
                */}
                <Text variant="caption" tone="textSecondary">
                  {technique.modality === 'flashcards'
                    ? 'No lesson found for this one yet — the deck below is the practice. Reps will look again next time you open it.'
                    : `Nothing worth watching for this one — it’s a ${technique.modality.replace(/_/g, ' ')} technique, so the practice below is the lesson.`}
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

            {technique.status === 'completed' ? (
              <Button
                label="Practise again"
                variant="secondary"
                onPress={() => router.push(`/practice/${technique.id}`)}
                style={styles.start}
                testID="start-rep"
              />
            ) : (
              <Button
                label="Start the rep"
                onPress={() => router.push(`/practice/${technique.id}`)}
                style={styles.start}
                testID="start-rep"
              />
            )}

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
                <Button label="Try again" variant="secondary" onPress={load} style={styles.retry} />
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
                {/* "while watching" is wrong on a technique with no video -
                    caught on the emulator, where a flashcards technique showed
                    it. The empty state has to describe the practice this
                    technique actually has. */}
                {primaryResource
                  ? 'Nothing yet. Notes you take while watching land here with the moment they belong to.'
                  : 'Nothing yet. Anything you notice while practising lands here.'}
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

            <View style={styles.adapt}>
              <Text variant="overline" tone="textSecondary">
                Not working?
              </Text>
              {/*
                Both actions live below the notes rather than beside the primary
                CTA. They are deliberate decisions with real consequences, and
                "Not for me" regenerates the tail of the path - neither belongs
                a thumb's width from "Start the rep".
              */}
              <Text variant="caption" tone="textSecondary">
                Reps will change the path rather than leave you stuck.
              </Text>
              <View style={styles.adaptRow}>
                <Button
                  label="Too hard"
                  variant="secondary"
                  onPress={() => setAdapt('too_hard')}
                  compact
                  fullWidth={false}
                  style={styles.adaptButton}
                  testID="too-hard"
                />
                <Button
                  label="Not for me"
                  variant="secondary"
                  onPress={() => setAdapt('skip')}
                  compact
                  fullWidth={false}
                  style={styles.adaptButton}
                  testID="not-for-me"
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <AdaptSheet
        action={adapt}
        technique={technique}
        onClose={() => setAdapt(null)}
        onDone={() => {
          setAdapt(null);
          reload();
        }}
      />

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
  start: { marginTop: space.md },
  jumped: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingVertical: 5,
    paddingHorizontal: space.md,
    borderRadius: 8,
    backgroundColor: color.brand,
  },
  adapt: { marginTop: space.xxl, gap: space.xs },
  adaptRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  adaptButton: { flex: 1 },
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
