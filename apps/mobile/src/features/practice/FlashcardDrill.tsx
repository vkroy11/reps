import type { FlashcardsContent } from '@reps/core';
import {
  Button,
  PipMascot,
  Text,
  color,
  duration,
  font,
  radius,
  space,
  standardEasing,
  useReduceMotion,
} from '@reps/ui';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** How the learner rates a card, and what each rating does to the deck. */
type Grade = 'again' | 'almost' | 'got';

const GRADES: { key: Grade; label: string; hint: string; fill: string }[] = [
  { key: 'again', label: 'Again', hint: 'Missed it', fill: color.danger },
  { key: 'almost', label: 'Almost', hint: 'Slow recall', fill: color.streakText },
  { key: 'got', label: 'Got it', hint: 'Instant', fill: color.progressText },
];

export interface FlashcardDrillProps {
  content: FlashcardsContent;
  /** Called when the deck is finished, with what the learner scored. */
  onFinished: (tally: Record<Grade, number>) => void;
}

interface Card {
  front: string;
  back: string;
}

/**
 * The deck, as a rep rather than a reading list.
 *
 * A flashcards technique used to show its cards as a static list, which is the
 * one presentation that cannot work: seeing the answer next to the question is
 * recognition, and the whole point of a deck is retrieval. So the card flips,
 * and it only flips when the learner asks.
 *
 * Grading is self-reported and deliberately three-way. Two buttons collapse
 * "I knew it eventually" into either a lie or a failure, and "eventually" is
 * the state most worth tracking - it is the difference between a card that is
 * learned and one that is about to be forgotten.
 *
 * The missed cards come round again in the same session. A deck that ends
 * while you still cannot answer three of its cards has taught you nothing, and
 * waiting until tomorrow to find that out wastes the day.
 */
export function FlashcardDrill({ content, onFinished }: FlashcardDrillProps) {
  const reduceMotion = useReduceMotion();
  const [queue, setQueue] = useState<Card[]>(() => [...content.cards]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<Card[]>([]);
  const [tally, setTally] = useState<Record<Grade, number>>({ again: 0, almost: 0, got: 0 });
  const [done, setDone] = useState(false);

  const spin = useSharedValue(0);
  const card = queue[index] ?? null;

  const flip = useCallback(() => {
    const next = !flipped;
    setFlipped(next);
    spin.value = reduceMotion
      ? next
        ? 1
        : 0
      : withTiming(next ? 1 : 0, { duration: duration.slow, easing: standardEasing });
  }, [flipped, reduceMotion, spin]);

  /* Two faces on one card: each shows only while its side is toward you. */
  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(spin.value, [0, 1], [0, 180])}deg` },
    ],
    opacity: spin.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(spin.value, [0, 1], [180, 360])}deg` },
    ],
    opacity: spin.value < 0.5 ? 0 : 1,
  }));

  const grade = (key: Grade) => {
    if (!card) return;

    const nextTally = { ...tally, [key]: tally[key] + 1 };
    setTally(nextTally);
    // "Almost" comes back too: a card you had to dig for is not yet known.
    const nextMissed = key === 'got' ? missed : [...missed, card];
    setMissed(nextMissed);

    setFlipped(false);
    spin.value = 0;

    if (index + 1 < queue.length) {
      setIndex(index + 1);

      return;
    }

    setDone(true);
    onFinished(nextTally);
  };

  const reviewMissed = () => {
    setQueue(missed);
    setMissed([]);
    setIndex(0);
    setFlipped(false);
    setDone(false);
    spin.value = 0;
  };

  const total = queue.length;
  const dots = useMemo(() => Array.from({ length: total }, (_, at) => at), [total]);

  if (done) {
    return (
      <View style={styles.summary}>
        <PipMascot size={96} expression="cheer" />
        <Text variant="title" center style={styles.summaryTitle}>
          Deck done
        </Text>
        <Text variant="body" tone="textSecondary" center>
          {tally.got} of {content.cards.length} instant · {tally.again + tally.almost} coming back
          around
        </Text>

        <View style={styles.tally}>
          {GRADES.map((item) => (
            <View key={item.key} style={styles.tallyCell}>
              <Text variant="title" style={{ color: item.fill }}>
                {tally[item.key]}
              </Text>
              <Text variant="overline" tone="textSecondary" style={styles.tallyLabel}>
                {item.label.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        {missed.length > 0 ? (
          <Button
            label={`Review the ${missed.length} you missed`}
            onPress={reviewMissed}
            style={styles.review}
            testID="deck-review-missed"
          />
        ) : null}
      </View>
    );
  }

  if (!card) return null;

  return (
    <View style={styles.drill}>
      <View style={styles.head}>
        <Text variant="overline" tone="textSecondary">
          THE DECK
        </Text>
        <Text variant="caption" tone="textSecondary" style={styles.counter}>
          {index + 1}/{total}
        </Text>
      </View>

      <View style={styles.dots}>
        {dots.map((at) => (
          <View
            key={at}
            style={[
              styles.dot,
              {
                backgroundColor:
                  at < index ? color.progress : at === index ? color.brand : color.surfaceLocked,
              },
            ]}
          />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          flipped
            ? `Answer: ${card.back}. Tap to flip back.`
            : `${card.front}. Tap to reveal the answer.`
        }
        onPress={flip}
        style={styles.cardSlot}
        testID="deck-card"
      >
        {/*
          Each face renders its text only while it is the one facing the
          learner. Hiding the back with opacity alone leaves the answer in the
          view tree, where a screen reader reads it out before any attempt has
          been made - which turns retrieval practice into recognition, the one
          thing a deck must not do.
        */}
        <Animated.View
          style={[styles.face, styles.front, frontStyle]}
          accessibilityElementsHidden={flipped}
          importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
        >
          {flipped ? null : (
            <>
              <Text variant="overline" tone="textSecondary">
                FRONT
              </Text>
              <Text center style={styles.frontText}>
                {card.front}
              </Text>
              <Text variant="caption" tone="textSecondary">
                Tap to reveal
              </Text>
            </>
          )}
        </Animated.View>

        <Animated.View
          style={[styles.face, styles.back, backStyle]}
          accessibilityElementsHidden={!flipped}
          importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
        >
          {flipped ? (
            <>
              <Text variant="overline" style={styles.backKicker}>
                BACK
              </Text>
              <Text center style={styles.backText}>
                {card.back}
              </Text>
            </>
          ) : null}
        </Animated.View>
      </Pressable>

      {flipped ? (
        <View style={styles.grades}>
          {GRADES.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}: ${item.hint}`}
              onPress={() => grade(item.key)}
              style={[styles.grade, { backgroundColor: item.fill }]}
              testID={`grade-${item.key}`}
            >
              <Text variant="label" tone="textOnBrand">
                {item.label}
              </Text>
              <Text variant="overline" tone="textOnBrand" style={styles.gradeHint}>
                {item.hint}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        /* Said before the flip, because grading a card you never attempted is
           how a deck quietly stops working. */
        <Text variant="caption" tone="textSecondary" center style={styles.coach}>
          Say the answer out loud, then flip. Grading before you try is how decks stop working.
        </Text>
      )}
    </View>
  );
}

const CARD_HEIGHT = 300;

const styles = StyleSheet.create({
  drill: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  counter: { fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 5, borderRadius: radius.full },
  cardSlot: { height: CARD_HEIGHT, marginTop: space.xs },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: 26,
    backfaceVisibility: 'hidden',
  },
  front: { backgroundColor: color.surfaceCard, borderColor: color.borderDefault },
  back: { backgroundColor: color.brandSoft, borderColor: color.brand },
  frontText: { fontFamily: font.extrabold, fontSize: 26, lineHeight: 33, color: color.textPrimary },
  backKicker: { color: color.brandPressed },
  backText: { fontFamily: font.extrabold, fontSize: 21, lineHeight: 29, color: color.textPrimary },
  grades: { flexDirection: 'row', gap: space.sm + 1 },
  grade: {
    flex: 1,
    minHeight: 60,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  gradeHint: { marginTop: 2, opacity: 0.85 },
  coach: { minHeight: 60, paddingHorizontal: space.base },
  summary: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg },
  summaryTitle: { marginTop: space.md },
  tally: { flexDirection: 'row', gap: space.md, alignSelf: 'stretch', marginTop: space.base },
  tallyCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.surfaceCard,
  },
  tallyLabel: { marginTop: 3 },
  review: { alignSelf: 'stretch', marginTop: space.lg },
});
