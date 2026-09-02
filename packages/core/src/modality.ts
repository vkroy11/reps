import type { ContentFormat, Modality, SkillArchetype } from './domain';

/**
 * The Skill Modality Engine.
 *
 * A learner's format preference is a bias, not a veto: reading about strumming
 * does not teach timing. These rules decide when the skill overrides the
 * preference, and produce the one-line explanation the UI shows when it does.
 */

const MODALITY_BY_ARCHETYPE: Record<SkillArchetype, Modality> = {
  motor: 'watch_and_do',
  strategic: 'drill',
  recall: 'flashcards',
  craft: 'produce_and_critique',
};

/** Formats that can carry a given modality, most important first. */
const FORMATS_BY_MODALITY: Record<Modality, readonly ContentFormat[]> = {
  watch_and_do: ['video', 'drill'],
  drill: ['drill', 'article', 'ai_lesson'],
  flashcards: ['flashcards', 'ai_lesson'],
  produce_and_critique: ['drill', 'article', 'video'],
};

/** Modalities where a passive format cannot substitute for doing the thing. */
const HANDS_ON_MODALITIES: readonly Modality[] = ['watch_and_do', 'produce_and_critique'];

/**
 * Modalities that misrepresent the skill, whatever a model suggests.
 * Flashcards on a physical skill are the same category of mistake as a
 * multiple-choice quiz for chess: chord changes are a motor problem, not a
 * recall problem, so this is enforced rather than merely requested.
 */
const FORBIDDEN_MODALITIES: Record<SkillArchetype, readonly Modality[]> = {
  motor: ['flashcards'],
  craft: ['flashcards'],
  strategic: [],
  recall: [],
};

const PASSIVE_FORMATS: readonly ContentFormat[] = ['article', 'ai_lesson'];

/** The format the model generates for a technique when content is opened. */
const GENERATED_FORMAT_BY_MODALITY: Record<Modality, GeneratedContentFormat> = {
  watch_and_do: 'drill',
  drill: 'drill',
  flashcards: 'flashcards',
  produce_and_critique: 'drill',
};

/** The subset of formats a model can produce directly, with no external source. */
export type GeneratedContentFormat = Extract<ContentFormat, 'ai_lesson' | 'flashcards' | 'drill'>;

export function defaultModalityFor(archetype: SkillArchetype): Modality {
  return MODALITY_BY_ARCHETYPE[archetype];
}

export function generatedContentFormatFor(modality: Modality): GeneratedContentFormat {
  return GENERATED_FORMAT_BY_MODALITY[modality];
}

export function formatsFor(modality: Modality): readonly ContentFormat[] {
  return FORMATS_BY_MODALITY[modality];
}

export function isModalityAllowedFor(archetype: SkillArchetype, modality: Modality): boolean {
  return !FORBIDDEN_MODALITIES[archetype].includes(modality);
}

/**
 * Replaces a modality the skill cannot support with the archetype's default.
 * A path may legitimately mix modalities - a warm-up, then drills, then a
 * performance - so only genuinely wrong combinations are rewritten.
 */
export function coerceModality(archetype: SkillArchetype, modality: Modality): Modality {
  return isModalityAllowedFor(archetype, modality) ? modality : defaultModalityFor(archetype);
}

/**
 * Resolves the formats to source for a technique: the learner's preferences
 * where they can carry the modality, otherwise what the modality requires.
 */
export function resolveFormats(
  modality: Modality,
  preferredFormats: readonly ContentFormat[],
): ContentFormat[] {
  const supported = FORMATS_BY_MODALITY[modality];
  const overlap = preferredFormats.filter((format) => supported.includes(format));

  return overlap.length > 0 ? overlap : [...supported];
}

/**
 * The explanation shown when a technique ignores a stated preference. Returns
 * null when nothing was overridden, so the UI stays quiet in the common case.
 */
export function explainModalityOverride(
  techniqueTitle: string,
  modality: Modality,
  preferredFormats: readonly ContentFormat[],
): string | null {
  if (preferredFormats.length === 0) return null;

  const supported = FORMATS_BY_MODALITY[modality];
  const preferenceIsSupported = preferredFormats.some((format) => supported.includes(format));
  if (preferenceIsSupported) return null;

  const wantedPassive = preferredFormats.every((format) => PASSIVE_FORMATS.includes(format));
  if (wantedPassive && HANDS_ON_MODALITIES.includes(modality)) {
    return `${techniqueTitle} is something you have to do, not read about — so this one is a short demo you copy.`;
  }

  return `${techniqueTitle} works best in a different format than you picked, so this one switches it up.`;
}
