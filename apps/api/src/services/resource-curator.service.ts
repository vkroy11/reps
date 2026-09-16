import { sourceFormats, type LearningPath, type Resource, type Technique } from '@reps/core';
import { logger } from '../config/logger';
import { AppError } from '../lib/errors';
import { newId } from '../lib/ids';
import type { AiProvider } from '../providers/ai';
import type { ArticleProvider, ResourceProvider } from '../providers/resources';
import { toPathContext } from './context';

export type CuratablePath = Pick<
  LearningPath,
  'id' | 'skill' | 'goal' | 'level' | 'language' | 'dailyMinutes' | 'daysPerWeek' | 'preferredFormats'
>;

export type CuratableTechnique = Pick<
  Technique,
  'id' | 'title' | 'whyItMatters' | 'modality' | 'searchQueries' | 'estimatedMinutes' | 'practicePrompt'
>;

const MAX_QUERIES_PER_TECHNIQUE = 2;
const MAX_CANDIDATES_PER_FORMAT = 4;
const RESULTS_PER_QUERY = 4;

export function createResourceCurator(deps: {
  ai: AiProvider;
  resources: ResourceProvider;
  articles?: ArticleProvider;
}) {
  return {
    async curate(path: CuratablePath, technique: CuratableTechnique): Promise<Resource[]> {
      const formats = sourceFormats(technique.modality, path.preferredFormats);
      const wantVideo = formats.includes('video');
      const wantArticle = formats.includes('article') || formats.includes('ai_lesson');

      if (!wantVideo && !wantArticle) return [];

      try {
        const candidates = await this.findCandidates(path, technique, { wantVideo, wantArticle });
        let resources: Resource[] = [];

        if (candidates.length > 0) {
          const { selections } = await deps.ai.rankResources({
            context: toPathContext(path),
            technique: {
              title: technique.title,
              whyItMatters: technique.whyItMatters,
              modality: technique.modality,
            },
            candidates,
          });

          const mapped: Resource[] = [];

          for (const selection of selections) {
            const candidate = candidates.find((item) => item.id === selection.candidateId);
            if (!candidate) continue;
            if (candidate.format === 'video' && !wantVideo) continue;
            if (candidate.format === 'article' && !wantArticle) continue;

            const extracted =
              candidate.format === 'article' && deps.articles
                ? await deps.articles.extract(candidate.url)
                : null;

            mapped.push({
              id: newId('res'),
              techniqueId: technique.id,
              format: candidate.format,
              title: extracted?.title ?? candidate.title,
              url: candidate.url,
              thumbnailUrl: candidate.thumbnailUrl,
              source: candidate.source,
              durationSec: candidate.durationSec,
              selectionReason: selection.reason,
              body: extracted?.body ?? null,
            });
          }

          resources = mapped;
        }

        const hasReadable = resources.some(
          (resource) => resource.format === 'article' || resource.format === 'ai_lesson',
        );

        if (wantArticle && !hasReadable) {
          const generated = await this.generateLesson(path, technique);
          if (generated) resources.push(generated);
        }

        return orderResources(resources, wantVideo);
      } catch (error) {
        if (error instanceof AppError) {
          logger.warn(
            { code: error.code, techniqueId: technique.id },
            'Resource curation degraded - continuing without external resources',
          );

          if (wantArticle) {
            const generated = await this.generateLesson(path, technique);
            return generated ? [generated] : [];
          }

          return [];
        }

        throw error;
      }
    },

    async findCandidates(
      path: CuratablePath,
      technique: CuratableTechnique,
      want: { wantVideo: boolean; wantArticle: boolean },
    ) {
      const queries = technique.searchQueries.slice(0, MAX_QUERIES_PER_TECHNIQUE);
      const byId = new Map<string, Awaited<ReturnType<ResourceProvider['search']>>[number]>();

      const formats = [
        ...(want.wantVideo ? (['video'] as const) : []),
        ...(want.wantArticle ? (['article'] as const) : []),
      ];

      for (const format of formats) {
        for (const text of queries) {
          const candidates = await deps.resources.search({
            text,
            language: path.language,
            maxResults: RESULTS_PER_QUERY,
            format,
          });

          for (const candidate of candidates) {
            if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
          }
        }
      }

      const all = [...byId.values()];
      const videos = all.filter((item) => item.format === 'video').slice(0, MAX_CANDIDATES_PER_FORMAT);
      const articles = all
        .filter((item) => item.format === 'article')
        .slice(0, MAX_CANDIDATES_PER_FORMAT);

      return [...videos, ...articles];
    },

    async generateLesson(
      path: CuratablePath,
      technique: CuratableTechnique,
    ): Promise<Resource | null> {
      try {
        const content = await deps.ai.generateContent({
          context: toPathContext(path),
          technique: {
            title: technique.title,
            whyItMatters: technique.whyItMatters,
            practicePrompt: technique.practicePrompt,
            modality: technique.modality,
          },
          format: 'ai_lesson',
        });

        if (content.format !== 'ai_lesson') return null;

        return {
          id: newId('res'),
          techniqueId: technique.id,
          format: 'ai_lesson',
          title: content.title,
          url: null,
          thumbnailUrl: null,
          source: 'Reps',
          durationSec: null,
          selectionReason:
            'Nothing on the open web was a good match, so Reps wrote a short lesson for this one.',
          body: [content.body, '', ...content.keyPoints.map((point) => `• ${point}`)].join('\n'),
        };
      } catch (error) {
        if (error instanceof AppError) {
          logger.warn(
            { code: error.code, techniqueId: technique.id },
            'Generated lesson degraded - continuing without one',
          );

          return null;
        }

        throw error;
      }
    },
  };
}

export type ResourceCurator = ReturnType<typeof createResourceCurator>;

/** Video first so older apps, which only play resources[0], still get a demo. */
function orderResources(resources: Resource[], wantVideo: boolean): Resource[] {
  if (!wantVideo) return resources;

  return [...resources].sort((left, right) => {
    const rank = (format: Resource['format']) => (format === 'video' ? 0 : 1);

    return rank(left.format) - rank(right.format);
  });
}
