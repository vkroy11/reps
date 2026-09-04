import { resolveFormats, type ContentFormat, type Modality } from '@reps/core';
import { Text, color } from '@reps/ui';
import BookOpen from 'lucide-react-native/icons/book-open';
import FileText from 'lucide-react-native/icons/file-text';
import Layers from 'lucide-react-native/icons/layers';
import NotebookPen from 'lucide-react-native/icons/notebook-pen';
import Play from 'lucide-react-native/icons/play';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
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

const GLYPH: Record<ContentFormat, typeof Play> = {
  video: Play,
  drill: RotateCcw,
  article: FileText,
  flashcards: Layers,
  ai_lesson: BookOpen,
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
      {adjusted.map((slice) => {
        const Glyph = GLYPH[slice.format];

        return (
          <View key={slice.format} style={[styles.stage, styles.stagePractice]}>
            <Glyph size={15} color={color.textOnBrand} strokeWidth={2.4} />
            <Text variant="caption" tone="textOnBrand" style={styles.label}>
              {LABELS[slice.format]}
            </Text>
            <Text variant="overline" tone="textOnBrand" style={styles.minutes}>
              {slice.minutes} min
            </Text>
          </View>
        );
      })}
      {/* Reflect is a stage in card colours because it is part of the session
          but not part of the practice - it is what makes the rep count. */}
      <View style={[styles.stage, styles.stageReflect]}>
        <NotebookPen size={15} color={color.textSecondary} strokeWidth={2.4} />
        <Text variant="caption" tone="textSecondary" style={styles.label}>
          Reflect
        </Text>
        <Text variant="overline" tone="textSecondary" style={styles.minutes}>
          {REFLECT_MINUTES} min
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
  /*
    Equal-width stages rather than chips sized to their text. The row is a
    picture of the session, so a 12-minute watch and a 1-minute reflect being
    the same width is deliberate: the stages are steps, not a bar chart.
  */
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 6, alignSelf: 'stretch' },
  stage: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 13,
  },
  stagePractice: { backgroundColor: color.brand },
  stageReflect: { backgroundColor: color.surfaceCard },
  label: { marginTop: 5 },
  minutes: { marginTop: 1, letterSpacing: 0.3 },
});
