import { resolveFormats, type ContentFormat, type Modality } from '@reps/core';
import { Text, color, radius, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';

/** A minute is the smallest chip worth drawing. */
const MIN_SLICE = 1;
/** Reflecting takes about this long, and it is not optional. */
const REFLECT_MINUTES = 1;

const LABELS: Record<ContentFormat, string> = {
  video: 'Watch',
  drill: 'Drill',
  article: 'Read',
  flashcards: 'Cards',
  ai_lesson: 'Lesson',
};

/** How the session's minutes divide between formats. */
const SHARE: Partial<Record<ContentFormat, number>> = {
  video: 0.35,
  drill: 0.5,
  article: 0.25,
  flashcards: 0.4,
  ai_lesson: 0.3,
};

export interface SessionPlanProps {
  modality: Modality;
  preferredFormats: ContentFormat[];
  totalMinutes: number;
}

/**
 * What the next session is actually made of, as minutes per format.
 *
 * This replaced Pip in the hero. A mascot there carried no information; this
 * answers the question somebody opening the app actually has - "what am I about
 * to do for twenty minutes" - before they commit to starting.
 *
 * The formats come from the modality engine, not from the stated preference
 * alone: a motor skill never shows a flashcard chip however much the learner
 * likes flashcards.
 */
export function SessionPlan({ modality, preferredFormats, totalMinutes }: SessionPlanProps) {
  const formats = resolveFormats(modality, preferredFormats);
  const practiceMinutes = Math.max(totalMinutes - REFLECT_MINUTES, MIN_SLICE);

  const weights = formats.map((format) => SHARE[format] ?? 0.3);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  // Rounded per slice, then the remainder goes to the largest one, so the
  // chips always add up to the number promised above them.
  const slices = formats.map((format, index) => ({
    format,
    minutes: Math.max(
      Math.round((practiceMinutes * (weights[index] ?? 0)) / totalWeight),
      MIN_SLICE,
    ),
  }));
  const drift = practiceMinutes - slices.reduce((sum, slice) => sum + slice.minutes, 0);
  const largest = slices.reduce(
    (best, slice, index) => (slice.minutes > (slices[best]?.minutes ?? 0) ? index : best),
    0,
  );
  const adjusted = slices.map((slice, index) =>
    index === largest ? { ...slice, minutes: Math.max(slice.minutes + drift, MIN_SLICE) } : slice,
  );

  return (
    <View style={styles.row} accessibilityLabel={`This session: ${describe(adjusted)}`}>
      {adjusted.map((slice) => (
        <View key={slice.format} style={[styles.chip, styles.chipActive]}>
          <Text variant="caption" tone="textOnBrand">
            {slice.minutes}m {LABELS[slice.format]}
          </Text>
        </View>
      ))}
      {/* Reflect is a chip in card colours because it is part of the session
          but not part of the practice - it is what makes the rep count. */}
      <View style={[styles.chip, styles.chipReflect]}>
        <Text variant="caption" tone="textSecondary">
          {REFLECT_MINUTES}m Reflect
        </Text>
      </View>
    </View>
  );
}

function describe(slices: { format: ContentFormat; minutes: number }[]): string {
  const parts = slices.map((slice) => `${slice.minutes} minutes ${LABELS[slice.format]}`);

  return [...parts, `${REFLECT_MINUTES} minute reflect`].join(', ');
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { paddingVertical: 7, paddingHorizontal: space.md, borderRadius: radius.chip },
  chipActive: { backgroundColor: color.brand },
  chipReflect: { backgroundColor: color.surfaceSunken },
});
