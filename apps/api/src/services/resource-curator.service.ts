import { resolveFormats, type LearningPath, type Resource, type Technique } from '@reps/core';
import { logger } from '../config/logger';
import { AppError } from '../lib/errors';
import { newId } from '../lib/ids';
import type { AiProvider } from '../providers/ai';
import type { ResourceProvider } from '../providers/resources';
import { toPathContext } from './context';

/**
 * What curation actually needs from a path and a technique.
 *
 * Stated as the read set rather than the full domain types so a path being
 * assembled - which has no XP or badges yet, and techniques with no practice
 * minutes - can be curated without inventing values for fields curation does
 * not look at.
 */
export type CuratablePath = Pick<
  LearningPath,
  'id' | 'skill' | 'goal' | 'level' | 'language' | 'dailyMinutes' | 'daysPerWeek' | 'preferredFormats'
>;

export type CuratableTechnique = Pick<
  Technique,
  'id' | 'title' | 'whyItMatters' | 'modality' | 'searchQueries' | 'estimatedMinutes'
>;

/**
 * Kept deliberately small. Every candidate costs prompt tokens at ranking
 * time, and Groq's free tier allows 8K tokens/minute - five candidates is
 * plenty to choose from and leaves headroom for the rest of the pipeline.
 */
const MAX_QUERIES_PER_TECHNIQUE = 2;
const MAX_CANDIDATES = 5;
const RESULTS_PER_QUERY = 4;

export function createResourceCurator(deps: { ai: AiProvider; resources: ResourceProvider }) {
  return {
    /**
     * Finds and ranks external resources for one technique.
     *
     * Returns an empty list rather than throwing when the resource or model
     * layer is unavailable: a path with no video is still a usable path, but a
     * failed path creation is not. The technique falls back to generated
     * content in that case.
     */
    /**
     * Takes the draft shapes rather than the stored ones: curation happens
     * while a path is still being assembled, before the read-side aggregates
     * exist. It only ever reads these.
     */
    async curate(path: CuratablePath, technique: CuratableTechnique): Promise<Resource[]> {
      const formats = resolveFormats(technique.modality, path.preferredFormats);

      // Drill- and flashcard-shaped techniques are served by generated content.
      if (!formats.includes('video')) return [];

      try {
        const candidates = await this.findCandidates(path, technique);
        if (candidates.length === 0) return [];

        const { selections } = await deps.ai.rankResources({
          context: toPathContext(path),
          technique: {
            title: technique.title,
            whyItMatters: technique.whyItMatters,
            modality: technique.modality,
          },
          candidates,
        });

        return selections.flatMap((selection) => {
          const candidate = candidates.find((item) => item.id === selection.candidateId);
          if (!candidate) return [];

          return [
            {
              id: newId('res'),
              techniqueId: technique.id,
              format: candidate.format,
              title: candidate.title,
              url: candidate.url,
              thumbnailUrl: candidate.thumbnailUrl,
              source: candidate.source,
              durationSec: candidate.durationSec,
              selectionReason: selection.reason,
            },
          ];
        });
      } catch (error) {
        if (error instanceof AppError) {
          logger.warn(
            { code: error.code, techniqueId: technique.id },
            'Resource curation degraded - continuing without external resources',
          );

          return [];
        }

        throw error;
      }
    },

    async findCandidates(path: CuratablePath, technique: CuratableTechnique) {
      const queries = technique.searchQueries.slice(0, MAX_QUERIES_PER_TECHNIQUE);
      const byId = new Map<string, Awaited<ReturnType<ResourceProvider['search']>>[number]>();

      for (const text of queries) {
        const candidates = await deps.resources.search({
          text,
          language: path.language,
          maxResults: RESULTS_PER_QUERY,
        });

        for (const candidate of candidates) {
          if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
        }
      }

      return [...byId.values()].slice(0, MAX_CANDIDATES);
    },
  };
}

export type ResourceCurator = ReturnType<typeof createResourceCurator>;
