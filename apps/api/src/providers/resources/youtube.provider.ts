import type { ResourceCandidate } from '@reps/core';
import { ProviderUnavailableError, QuotaExhaustedError } from '../../lib/errors';
import type { QuotaRepository } from '../../repositories/types';
import type { ResourceProvider, ResourceQuery } from './types';

const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * YouTube quota costs, from the Data API v3 documentation. The daily default is
 * 10,000 units, so search is the expensive call and durations are nearly free.
 */
const SEARCH_UNIT_COST = 100;
const VIDEOS_UNIT_COST = 1;
const QUOTA_RESOURCE = 'youtube';

/**
 * YouTube returns `snippet` text HTML-escaped, because the API predates
 * everyone consuming it as JSON: a title comes back as
 * "Just Flour &amp; Water" and a channel as "Paul&#39;s". Stored raw, that is
 * what the learner reads on the card.
 *
 * Only the five XML entities plus numeric references, which is all the API
 * emits - a general HTML parser here would be a dependency and an attack
 * surface for no extra correctness.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtml(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);

      // Anything outside the Unicode range, or a failed parse, stays literal
      // rather than becoming a replacement character.
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }

    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const MIN_USEFUL_DURATION_SEC = 90;

interface SearchResponse {
  items?: {
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    };
  }[];
}

interface VideosResponse {
  items?: { id?: string; contentDetails?: { duration?: string } }[];
}

/** Parses ISO 8601 durations as returned by videos.list, e.g. PT8M31S. */
export function parseIsoDuration(value: string): number | null {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return null;

  const [days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => (part ? Number.parseInt(part, 10) : 0));

  return (days ?? 0) * 86_400 + (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
}

export function createYouTubeProvider(options: {
  apiKey: string;
  quota: QuotaRepository;
  dailyUnitBudget: number;
}): ResourceProvider {
  async function requireQuota(units: number): Promise<void> {
    const consumed = await options.quota.consumedToday(QUOTA_RESOURCE);

    if (consumed + units > options.dailyUnitBudget) {
      throw new QuotaExhaustedError('YouTube');
    }

    await options.quota.consume(QUOTA_RESOURCE, units);
  }

  async function getJson<T>(url: URL, label: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      throw new ProviderUnavailableError('youtube', (error as Error).message);
    }

    if (response.status === 403 || response.status === 429) {
      throw new QuotaExhaustedError('YouTube');
    }
    if (!response.ok) {
      throw new ProviderUnavailableError('youtube', `${label} returned HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  }

  /** Durations cost 1 unit for the whole batch and decide what fits a session. */
  async function fetchDurations(videoIds: string[]): Promise<Map<string, number>> {
    const durations = new Map<string, number>();
    if (videoIds.length === 0) return durations;

    await requireQuota(VIDEOS_UNIT_COST);

    const url = new URL(VIDEOS_ENDPOINT);
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', videoIds.join(','));
    url.searchParams.set('key', options.apiKey);

    const body = await getJson<VideosResponse>(url, 'videos.list');

    for (const item of body.items ?? []) {
      const raw = item.contentDetails?.duration;
      const seconds = raw ? parseIsoDuration(raw) : null;

      if (item.id && seconds !== null) durations.set(item.id, seconds);
    }

    return durations;
  }

  return {
    name: 'youtube',

    async search(query: ResourceQuery): Promise<ResourceCandidate[]> {
      await requireQuota(SEARCH_UNIT_COST);

      const url = new URL(SEARCH_ENDPOINT);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('q', query.text);
      url.searchParams.set('relevanceLanguage', query.language);
      url.searchParams.set('maxResults', String(query.maxResults ?? 6));
      url.searchParams.set('videoEmbeddable', 'true');
      url.searchParams.set('safeSearch', 'moderate');
      url.searchParams.set('key', options.apiKey);

      const body = await getJson<SearchResponse>(url, 'search.list');

      const items = (body.items ?? []).filter(
        (item): item is { id: { videoId: string }; snippet: NonNullable<typeof item.snippet> } =>
          Boolean(item.id?.videoId && item.snippet?.title),
      );

      const durations = await fetchDurations(items.map((item) => item.id.videoId));

      return items
        .map((item) => ({
          id: item.id.videoId,
          format: 'video' as const,
          title: decodeHtml(item.snippet.title ?? 'Untitled'),
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          thumbnailUrl:
            item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
          source: decodeHtml(item.snippet.channelTitle ?? 'YouTube'),
          durationSec: durations.get(item.id.videoId) ?? null,
          description: item.snippet.description ? decodeHtml(item.snippet.description) : null,
        }))
        .filter(
          (candidate) =>
            candidate.durationSec === null || candidate.durationSec >= MIN_USEFUL_DURATION_SEC,
        );
    },
  };
}
