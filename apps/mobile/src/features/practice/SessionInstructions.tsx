import type { TechniqueContent } from '@reps/core';
import { Card, Skeleton, Text, color, radius, space } from '@reps/ui';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export interface SessionInstructionsProps {
  content: TechniqueContent | null;
  loading: boolean;
}

/**
 * The written instructions, inside the session that needs them.
 *
 * The technique page has always held these, but the session is a different
 * route - so starting a drill meant either memorising six steps first or
 * backing out mid-rep to re-read them. `practicePrompt` above is the one-line
 * version; this is the whole thing.
 *
 * Collapsed by default, and inline rather than in a modal. A modal would cover
 * the timer, which is the one thing that has to stay visible while a rep runs;
 * collapsed, the panel keeps the timer above the fold until it is wanted.
 */
export function SessionInstructions({ content, loading }: SessionInstructionsProps) {
  const [open, setOpen] = useState(false);

  if (loading) return <Skeleton height={52} borderRadius={radius.card} />;
  if (!content) return null;

  const summary = describe(content);
  if (!summary) return null;

  return (
    <Card flush style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${summary}. ${open ? 'Hide' : 'Show'} the instructions.`}
        onPress={() => setOpen((current) => !current)}
        style={styles.head}
        testID="instructions-toggle"
      >
        <Text variant="label" style={styles.headLabel}>
          {summary}
        </Text>
        {open ? (
          <ChevronUp size={19} color={color.brandPressed} strokeWidth={2.6} />
        ) : (
          <ChevronDown size={19} color={color.brandPressed} strokeWidth={2.6} />
        )}
      </Pressable>

      {open ? <View style={styles.body}>{renderBody(content)}</View> : null}
    </Card>
  );
}

/** The header line, which doubles as the reason to open it. */
function describe(content: TechniqueContent): string | null {
  if (content.format === 'drill') {
    return `Step by step · ${content.steps.length} steps`;
  }
  if (content.format === 'flashcards') {
    return `The cards · ${content.cards.length}`;
  }

  return `${content.keyPoints.length} key points`;
}

function renderBody(content: TechniqueContent) {
  if (content.format === 'drill') {
    return (
      <>
        {content.steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.number}>
              <Text variant="caption" tone="textOnBrand">
                {index + 1}
              </Text>
            </View>
            <Text variant="body" style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
        {/* What "done" means, which is the part a one-line prompt cannot carry. */}
        <View style={styles.criteria}>
          <Text variant="overline" tone="progressText">
            DONE WHEN
          </Text>
          <Text variant="caption" tone="progressText" style={styles.criteriaText}>
            {content.successCriteria}
          </Text>
        </View>
      </>
    );
  }

  if (content.format === 'flashcards') {
    return (
      <>
        {content.cards.map((card) => (
          <View key={card.front} style={styles.card2}>
            <Text variant="label" numberOfLines={2}>
              {card.front}
            </Text>
            <Text variant="caption" tone="textSecondary" style={styles.back}>
              {card.back}
            </Text>
          </View>
        ))}
      </>
    );
  }

  return (
    <>
      {content.keyPoints.map((point) => (
        <View key={point} style={styles.step}>
          <View style={styles.bullet} />
          <Text variant="body" style={styles.stepText}>
            {point}
          </Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.base,
  },
  headLabel: { flex: 1, minWidth: 0, color: color.brandPressed },
  body: {
    gap: space.md,
    paddingHorizontal: space.base,
    paddingBottom: space.base,
    borderTopWidth: 1,
    borderTopColor: color.borderDefault,
    paddingTop: space.base,
  },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  number: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: color.brand,
    marginTop: 9,
    marginLeft: 8,
    marginRight: 9,
  },
  stepText: { flex: 1, minWidth: 0 },
  criteria: {
    padding: space.md,
    borderRadius: radius.input,
    backgroundColor: color.progressSoft,
  },
  criteriaText: { marginTop: 2 },
  card2: {
    padding: space.md,
    borderRadius: radius.input,
    backgroundColor: color.surfaceSunken,
  },
  back: { marginTop: space.xs },
});
