import {
  LearningPathSchema,
  type LearningPath,
  type Resource,
  type Technique,
} from '@reps/core';
import type { LearningPath as PathRow, Resource as ResourceRow, Technique as TechniqueRow } from '@prisma/client';

type TechniqueWithResources = TechniqueRow & { resources: ResourceRow[] };
type PathWithTechniques = PathRow & { techniques: TechniqueWithResources[] };

/**
 * Rows come back as plain strings for the vocabulary fields, so the domain
 * schema parses them on the way out. If a bad value ever reaches the database,
 * it surfaces here rather than somewhere further downstream.
 */
export function toDomainPath(row: PathWithTechniques): LearningPath {
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
  });
}

export function toTechniqueRow(technique: Technique) {
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
