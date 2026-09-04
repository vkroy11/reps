import { pathProgress } from '@reps/client';
import { masteryOf, type LearningPathSummary, type StreakState, type Technique } from '@reps/core';
import { Text, color, font, hit, radius, space } from '@reps/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { SessionPlan } from './SessionPlan';

export interface HeroPageProps {
  summary: LearningPathSummary;
  /**
   * This path's own next rep. Null once the path is finished, or while it is
   * still being fetched - the caller substitutes a placeholder for the latter,
   * so a page never shows a hobby's summary in place of its rep.
   */
  active: Technique | null;
  streak: StreakState;
  onStart: (techniqueId: string) => void;
  onOpen: (techniqueId: string) => void;
  testID?: string;
}

/**
 * One hobby, as an answer to "what am I doing today".
 *
 * Centred, on the gradient, with no card around it - the panel behind it *is*
 * the container. Everything below this on the screen is a card on the page, so
 * the one thing that is not a card is the one thing to act on.
 *
 * The order is fixed and deliberate: a nudge, then where you are, then what it
 * is, then what it costs, then what it buys you, then the button. Every line
 * answers the objection the previous one raises.
 */
export function HeroPage({ summary, active, streak, onStart, onOpen, testID }: HeroPageProps) {
  const finished = summary.completedCount >= summary.techniqueCount;

  if (finished) {
    return (
      <View style={styles.page} testID={testID}>
        <Text variant="overline" style={styles.kicker}>
          {summary.skill.toUpperCase()}
        </Text>
        <Text variant="display" center style={styles.title}>
          Path complete
        </Text>
        <Text variant="caption" tone="textSecondary" center>
          You did the thing you came here for.
        </Text>
      </View>
    );
  }

  if (!active) {
    return (
      <View style={styles.page} testID={testID}>
        <Text variant="overline" style={styles.kicker}>
          {summary.skill.toUpperCase()}
        </Text>
        <Text variant="title" center style={styles.title} numberOfLines={2}>
          {summary.goal}
        </Text>
        <Text variant="caption" tone="textSecondary" center>
          {summary.completedCount} of {summary.techniqueCount} levels ·{' '}
          {Math.round(pathProgress(summary) * 100)}%
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page} testID={testID}>
      <View style={styles.mood}>
        <Text variant="caption" style={moodStyle(streak)}>
          {moodLine(active, streak)}
        </Text>
      </View>

      <Text variant="overline" style={styles.kicker} numberOfLines={1}>
        {summary.skill.toUpperCase()} · LEVEL {active.order + 1} OF {summary.techniqueCount}
      </Text>

      {/* 29/35 rather than the display token: this can be a full sentence, and
          at 32/38 a two-line title pushes the CTA off a short screen. */}
      <Text center style={styles.heroTitle} numberOfLines={3}>
        {active.title}
      </Text>

      <Text variant="caption" tone="textSecondary" center style={styles.sub}>
        {active.estimatedMinutes} min · {active.modality.replace(/_/g, ' ')}
      </Text>

      <SessionPlan
        modality={active.modality}
        preferredFormats={summary.preferredFormats}
        totalMinutes={active.estimatedMinutes}
      />

      {/* Why this rep matters, in the learner's own goal's terms. On the card
          colour so it reads as a quote from the plan, not as body copy. */}
      <View style={styles.payoff}>
        <Text variant="caption" tone="progressText">
          {active.whyItMatters}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ctaLabel(active)}: ${active.title}`}
        onPress={() => onStart(active.id)}
        style={styles.cta}
        testID="start-rep"
      >
        <Text variant="label" style={styles.ctaLabel}>
          {ctaLabel(active)}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => onOpen(active.id)}
        style={styles.secondary}
        hitSlop={8}
      >
        <Text variant="caption" style={styles.secondaryLabel}>
          See the details first
        </Text>
      </Pressable>
    </View>
  );
}

/** "Finish" once there is something to finish; otherwise "start". */
function ctaLabel(active: Technique): string {
  return masteryOf(active) > 0.5 ? 'Finish this level' : 'Start today’s session';
}

/**
 * The one line above the title, and the only place the app nudges.
 *
 * It is a fact about the learner, not a slogan: half a level in, days off, a
 * streak worth keeping. A generic "Let's go!" here would be the first thing
 * they learn to stop reading.
 */
function moodLine(active: Technique, streak: StreakState): string {
  // Half-finished work outranks the streak: it is the more specific reason to
  // open the app, and it is about this level rather than about the calendar.
  if (masteryOf(active) > 0.5) return 'One solid rep and the next level opens';

  if (streak.current === 0) {
    return streak.totalMinutes > 0
      ? 'A short session restarts the streak'
      : 'One session starts the streak';
  }

  return streak.practisedToday
    ? `${streak.current}-day streak · today is in`
    : `${streak.current}-day streak · today keeps it alive`;
}

/**
 * Amber when today is still open, ink when it is done.
 *
 * The colour carries the only thing the learner can act on, so it goes warm
 * exactly while there is something to lose - not on a threshold number of
 * days, which would make the same sentence change colour for no visible reason.
 */
function moodStyle(streak: StreakState) {
  return streak.practisedToday ? styles.moodInk : styles.moodWarm;
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', paddingHorizontal: space.sm, paddingBottom: space.base - 2 },
  mood: {
    marginTop: space.xs + 2,
    paddingVertical: 5,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    backgroundColor: color.surfaceCard,
  },
  moodInk: { color: color.textSecondary },
  moodWarm: { color: color.streakText },
  kicker: { marginTop: space.md - 2, color: color.brandPressed, letterSpacing: 0.8 },
  title: { marginTop: space.xs },
  heroTitle: {
    marginTop: 5,
    marginBottom: space.xs,
    fontFamily: font.extrabold,
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.7,
    color: color.textPrimary,
  },
  sub: { marginBottom: space.md },
  payoff: {
    alignSelf: 'stretch',
    marginTop: space.md - 1,
    marginBottom: space.md + 1,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.input,
    backgroundColor: color.surfaceCard,
  },
  /*
    A pill on the gradient, not the app's square CTA. The square one has a
    4px bottom edge in brandPressed, which on a blue wash reads as a seam.
    White-on-gradient with a shadow is the affordance here.
  */
  cta: {
    height: 46,
    paddingHorizontal: 26,
    borderRadius: radius.full,
    backgroundColor: color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  ctaLabel: { color: color.brand, letterSpacing: 0.4 },
  secondary: {
    marginTop: space.sm,
    minHeight: hit.min - 20,
    justifyContent: 'center',
  },
  secondaryLabel: { color: color.brandPressed },
});
