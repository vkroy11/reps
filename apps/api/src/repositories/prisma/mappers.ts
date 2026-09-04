import {
  LearningPathSchema,
  type Badge,
  type LearningPath,
  type Resource,
  type Technique,
} from '@reps/core';
import type {
  Badge as BadgeRow,
  LearningPath as PathRow,
  Resource as ResourceRow,
  Technique as TechniqueRow,
} from '@prisma/client';

type TechniqueWithResources = TechniqueRow & { resources: ResourceRow[] };
type PathWithTechniques = PathRow & { techniques: TechniqueWithResources[] };

/**
 * The read-side aggregates a path cannot carry in its own row.
 *
 * Passed in rather than fetched here so the mapper stays synchronous and the
 * caller decides how many queries to spend - one per path when reading a single
 * path, one grouped query when listing several.
 */
export interface PathTotals {
  xp: number;
  badges: Badge[];
  minutesByTechnique: Record<string, number>;
}

export const EMPTY_TOTALS: PathTotals = { xp: 0, badges: [], minutesByTechnique: {} };

export function toDomainBadge(row: BadgeRow): Badge {
  return {
    id: row.id,
    userId: row.userId,
    pathId: row.pathId,
    stage: row.stage,
    label: row.label,
    earnedAt: row.earnedAt.toISOString(),
  };
}

/**
 * Rows come back as plain strings for the vocabulary fields, so the domain
 * schema parses them on the way out. If a bad value ever reaches the database,
 * it surfaces here rather than somewhere further downstream.
 */
export function toDomainPath(row: PathWithTechniques, totals: PathTotals = EMPTY_TOTALS): LearningPath {
  return LearningPathSchema.parse({
    id: row.id,
    userId: row.userId,
    skill: row.skill,
    archetype: row.archetype,
    goal: row.goal,
    level: row.level,
    dailyMinutes: row.dailyMinutes,
    daysPerWeek: row.daysPerWeek,
    preferredFormats: row.preferredFormats,
    language: row.language,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    techniques: [...row.techniques]
      .sort((left, right) => left.order - right.order)
      .map((technique) => ({
        id: technique.id,
        pathId: technique.pathId,
        order: technique.order,
        title: technique.title,
        whyItMatters: technique.whyItMatters,
        modality: technique.modality,
        practicePrompt: technique.practicePrompt,
        estimatedMinutes: technique.estimatedMinutes,
        status: technique.status,
        confidence: technique.confidence,
        struggleCount: technique.struggleCount,
        practiceMinutes: totals.minutesByTechnique[technique.id] ?? 0,
        bridgeForTechniqueId: technique.bridgeForTechniqueId,
        searchQueries: technique.searchQueries,
        resources: technique.resources.map((resource) => ({
          id: resource.id,
          techniqueId: resource.techniqueId,
          format: resource.format,
          title: resource.title,
          url: resource.url,
          thumbnailUrl: resource.thumbnailUrl,
          source: resource.source,
          durationSec: resource.durationSec,
          selectionReason: resource.selectionReason,
        })),
      })),
    xp: totals.xp,
    badges: totals.badges,
  });
}

/** Takes the write shape: practiceMinutes has no column, it is summed. */
export function toTechniqueRow(technique: Omit<Technique, 'practiceMinutes'>) {
  return {
    id: technique.id,
    pathId: technique.pathId,
    order: technique.order,
    title: technique.title,
    whyItMatters: technique.whyItMatters,
    modality: technique.modality,
    practicePrompt: technique.practicePrompt,
    estimatedMinutes: technique.estimatedMinutes,
    status: technique.status,
    confidence: technique.confidence,
    struggleCount: technique.struggleCount,
    bridgeForTechniqueId: technique.bridgeForTechniqueId,
    searchQueries: technique.searchQueries,
  };
}

export function toResourceRow(resource: Resource) {
  return {
    id: resource.id,
    techniqueId: resource.techniqueId,
    format: resource.format,
    title: resource.title,
    url: resource.url,
    thumbnailUrl: resource.thumbnailUrl,
    source: resource.source,
    durationSec: resource.durationSec,
    selectionReason: resource.selectionReason,
  };
}
