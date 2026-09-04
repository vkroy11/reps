import {
  coerceModality,
  type GeneratedTechnique,
  type LearningPath,
  type SkillArchetype,
  type Technique,
  type TechniqueStatus,
} from '@reps/core';
import { newId } from '../lib/ids';
import type { PathContext } from '../providers/ai/types';

/**
 * A technique as the services build and pass it around: everything except
 * `practiceMinutes`, which is summed from PracticeSession on read and so is
 * never something a service can supply.
 */
export type TechniqueDraft = Omit<Technique, 'practiceMinutes'>;

/** The fields a model prompt is built from. */
export type PathContextSource = Pick<
  LearningPath,
  'skill' | 'goal' | 'level' | 'language' | 'dailyMinutes' | 'daysPerWeek' | 'preferredFormats'
>;

export function toPathContext(path: PathContextSource): PathContext {
  return {
    skill: path.skill,
    goal: path.goal,
    level: path.level,
    language: path.language,
    dailyMinutes: path.dailyMinutes,
    daysPerWeek: path.daysPerWeek,
    preferredFormats: path.preferredFormats,
  };
}

/** Turns model output into a stored technique. Used by creation, bridging and regeneration. */
export function toTechnique(
  generated: GeneratedTechnique,
  placement: {
    pathId: string;
    order: number;
    status: TechniqueStatus;
    archetype: SkillArchetype;
    bridgeForTechniqueId?: string | null;
  },
): TechniqueDraft {
  return {
    id: newId('tec'),
    pathId: placement.pathId,
    order: placement.order,
    title: generated.title,
    whyItMatters: generated.whyItMatters,
    // Enforced here so every path, bridge and regenerated tail goes through it.
    modality: coerceModality(placement.archetype, generated.modality),
    practicePrompt: generated.practicePrompt,
    estimatedMinutes: generated.estimatedMinutes,
    status: placement.status,
    confidence: null,
    struggleCount: 0,
    bridgeForTechniqueId: placement.bridgeForTechniqueId ?? null,
    searchQueries: generated.searchQueries,
    resources: [],
  };
}

/** Order is positional, so it is recomputed after every insert or removal. */
export function renumber<T extends { order: number }>(techniques: T[]): T[] {
  return techniques.map((technique, index) => ({ ...technique, order: index }));
}

/**
 * Exactly one technique should be active whenever unfinished work remains, so
 * the home screen always has a "today" to show.
 */
export function ensureActiveTechnique<T extends { status: TechniqueStatus }>(
  techniques: T[],
): T[] {
  if (techniques.some((technique) => technique.status === 'active')) return techniques;

  const nextIndex = techniques.findIndex((technique) => technique.status === 'locked');
  if (nextIndex === -1) return techniques;

  return techniques.map((technique, index) =>
    index === nextIndex ? { ...technique, status: 'active' as const } : technique,
  );
}
