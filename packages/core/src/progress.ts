import { z } from 'zod';
import type { Technique } from './domain';

/**
 * The game layer: XP, gates and badges.
 *
 * All of it lives here rather than in the API, because the board draws gates
 * from the same rules the server awards badges by. Two implementations of
 * "every third technique" would drift, and the symptom would be a gate that
 * looks cleared but never grants its badge.
 */

/** A gate sits after every this-many techniques. */
export const GATE_EVERY = 3;

/** XP for each credited minute of practice. */
export const XP_PER_MINUTE = 2;

/**
 * A one-off bonus the first time a technique is reflected on.
 *
 * The bonus is for *closing the loop* - saying how it went - not for saying it
 * went well. See `xpForSession` for why that distinction matters.
 */
export const XP_FIRST_REFLECTION = 10;

/**
 * Minutes above this earn nothing further.
 *
 * The client reports practice time, so it is not trustworthy input. Without a
 * ceiling a single session could claim ten hours; with one, the worst case is
 * an hour's worth of credit, which is also roughly the longest session anyone
 * should be doing in an app that sells twenty-minute reps.
 */
export const XP_MAX_CREDITED_MINUTES = 60;

export const BadgeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pathId: z.string(),
  /** 1-based gate. Stage 1 covers techniques 1 to GATE_EVERY. */
  stage: z.number().int().positive(),
  /** The stage's capstone technique - the one whose completion cleared it. */
  label: z.string(),
  earnedAt: z.string(),
});
export type Badge = z.infer<typeof BadgeSchema>;

/** What a single reflection earned, so the celebration can state it exactly. */
export const XpAwardSchema = z.object({
  xp: z.number().int().nonnegative(),
  /** Minutes that actually counted, after the ceiling. */
  minutes: z.number().int().nonnegative(),
  /** Null unless this reflection closed a gate. */
  badge: BadgeSchema.nullable(),
});
export type XpAward = z.infer<typeof XpAwardSchema>;

/**
 * XP for one practice session.
 *
 * **Confidence is deliberately not an input.** Paying more for "solid" than for
 * "struggling" would pay people to overstate how it went, and confidence is the
 * signal the whole adaptation engine reads - two "struggling" reports are what
 * trigger the offer of an easier step. Corrupting that to make a number go up
 * would trade the product's only real feedback channel for a scoreboard.
 *
 * So XP measures time spent practising, plus a one-off for reporting at all.
 */
export function xpForSession(input: { minutes: number; firstReflection: boolean }): number {
  const credited = creditedMinutes(input.minutes);

  return credited * XP_PER_MINUTE + (input.firstReflection ? XP_FIRST_REFLECTION : 0);
}

export function creditedMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;

  return Math.min(Math.floor(minutes), XP_MAX_CREDITED_MINUTES);
}

/** The 1-based stage a technique at this index belongs to. */
export function stageOf(techniqueIndex: number): number {
  return Math.floor(techniqueIndex / GATE_EVERY) + 1;
}

/**
 * How many stages a path of this length has.
 *
 * A trailing partial stage still counts: five techniques are two stages, the
 * second of which is short. Rounding it away would leave the last two
 * techniques outside any gate and earning no badge.
 */
export function stageCount(techniqueCount: number): number {
  return Math.ceil(techniqueCount / GATE_EVERY);
}

/** How many stages this many completions has closed. */
export function clearedStages(completedCount: number, techniqueCount: number): number {
  return Math.min(Math.floor(completedCount / GATE_EVERY), stageCount(techniqueCount));
}

/**
 * The last technique of a stage - the one that clears it.
 *
 * Named `capstone` because that title becomes the badge: it is the most
 * specific true thing we can say about what the stage taught, and it needs no
 * model call to produce. A stage cut short by the end of the path capstones on
 * whatever its final technique is.
 */
export function capstoneOf(techniques: Technique[], stage: number): Technique | null {
  const last = Math.min(stage * GATE_EVERY, techniques.length) - 1;

  return techniques[last] ?? null;
}

/**
 * Progress toward mastering a technique, 0 to 1.
 *
 * Practice minutes against the estimate, which is the only honest reading we
 * have: a technique is "done" when the learner says so, but *how much of it
 * they have done* is time spent. Returns 0 for anything unpractised, and the
 * board only draws the ring above 0, so an untouched node shows no ring rather
 * than an empty one.
 */
export function masteryOf(technique: Pick<Technique, 'practiceMinutes' | 'estimatedMinutes'>): number {
  if (technique.estimatedMinutes <= 0) return 0;

  return Math.min(technique.practiceMinutes / technique.estimatedMinutes, 1);
}
