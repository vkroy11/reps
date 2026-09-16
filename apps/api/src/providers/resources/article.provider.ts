import type { ResourceCandidate } from '@reps/core';
import { ProviderUnavailableError } from '../../lib/errors';
import { fetchJson, fetchText, htmlToBody } from './extract';
import type { ResourceProvider, ResourceQuery } from './types';

interface MediaWikiSearchResponse {
  query?: {
    search?: { title: string; snippet?: string; pageid?: number }[];
  };
}

interface WikipediaExtractResponse {
  query?: {
    pages?: Record<
      string,
      { title?: string; extract?: string; missing?: boolean; pageid?: number }
    >;
  };
}

interface WikiHowParseResponse {
  parse?: { title?: string; text?: { '*': string } | string };
}

const WIKIPEDIA_HOST: Record<string, string> = {
  en: 'en.wikipedia.org',
  hi: 'hi.wikipedia.org',
  es: 'es.wikipedia.org',
};

const WIKIHOW_HOST: Record<string, string> = {
  en: 'www.wikihow.com',
  hi: 'www.wikihow.com',
  es: 'es.wikihow.com',
};

function wikipediaHost(language: string): string {
  return WIKIPEDIA_HOST[language] ?? WIKIPEDIA_HOST.en ?? 'en.wikipedia.org';
}

function wikiHowHost(language: string): string {
  return WIKIHOW_HOST[language] ?? WIKIHOW_HOST.en ?? 'www.wikihow.com';
}

function wikiHowPageUrl(host: string, title: string): string {
  return `https://${host}/${title.replace(/ /g, '-')}`;
}

function wikipediaPageUrl(host: string, title: string): string {
  return `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function stripSnippet(html: string): string {
  return htmlToBody(html).slice(0, 240);
}

/**
 * Articles from Wikipedia and wikiHow.
 *
 * Both are MediaWiki, both have a no-key search, and both return pages we can
 * extract into the native reader. The open web at large is not searched: a
 * general crawl would be quota, spam and an attack surface for a feature whose
 * job is "one good explainer for this technique".
 */
export function createArticleProvider(): ResourceProvider & {
  extract(url: string): Promise<{ title: string; body: string } | null>;
} {
  async function searchMediaWiki(
    host: string,
    text: string,
    maxResults: number,
  ): Promise<MediaWikiSearchResponse['query']> {
    const url = new URL(`https://${host}/api.php`);
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srsearch', text);
    url.searchParams.set('srlimit', String(maxResults));
    url.searchParams.set('srprop', 'snippet');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    const body = await fetchJson<MediaWikiSearchResponse>(url.toString());

    return body?.query;
  }

  return {
    name: 'article',

    async search(query: ResourceQuery): Promise<ResourceCandidate[]> {
      const maxResults = query.maxResults ?? 4;
      const perSource = Math.max(2, Math.ceil(maxResults / 2));
      const wikiHost = wikipediaHost(query.language);
      const howHost = wikiHowHost(query.language);
      let wikipedia: MediaWikiSearchResponse['query'];
      let wikihow: MediaWikiSearchResponse['query'];

      try {
        [wikipedia, wikihow] = await Promise.all([
          searchMediaWiki(wikiHost, query.text, perSource),
          searchMediaWiki(howHost, query.text, perSource),
        ]);
      } catch (error) {
        throw new ProviderUnavailableError('article', (error as Error).message);
      }

      const candidates: ResourceCandidate[] = [];

      for (const hit of wikipedia?.search ?? []) {
        if (!hit.title) continue;
        candidates.push({
          id: `wiki:${query.language}:${hit.pageid ?? hit.title}`,
          format: 'article',
          title: hit.title,
          url: wikipediaPageUrl(wikiHost, hit.title),
          thumbnailUrl: null,
          source: 'Wikipedia',
          durationSec: null,
          description: hit.snippet ? stripSnippet(hit.snippet) : null,
        });
      }

      for (const hit of wikihow?.search ?? []) {
        if (!hit.title) continue;
        candidates.push({
          id: `how:${hit.pageid ?? hit.title}`,
          format: 'article',
          title: hit.title,
          url: wikiHowPageUrl(howHost, hit.title),
          thumbnailUrl: null,
          source: 'wikiHow',
          durationSec: null,
          description: hit.snippet ? stripSnippet(hit.snippet) : null,
        });
      }

      return candidates.slice(0, maxResults);
    },

    async extract(url: string): Promise<{ title: string; body: string } | null> {
      const wikipedia = /https?:\/\/([a-z]+)\.wikipedia\.org\/wiki\/([^?#]+)/i.exec(url);
      if (wikipedia) {
        const host = `${wikipedia[1]}.wikipedia.org`;
        const title = decodeURIComponent((wikipedia[2] ?? '').replace(/_/g, ' '));
        const endpoint = new URL(`https://${host}/w/api.php`);
        endpoint.searchParams.set('action', 'query');
        endpoint.searchParams.set('prop', 'extracts');
        endpoint.searchParams.set('explaintext', '1');
        endpoint.searchParams.set('exsectionformat', 'plain');
        endpoint.searchParams.set('titles', title);
        endpoint.searchParams.set('format', 'json');
        endpoint.searchParams.set('origin', '*');
        endpoint.searchParams.set('redirects', '1');

        const body = await fetchJson<WikipediaExtractResponse>(endpoint.toString());
        const page = Object.values(body?.query?.pages ?? {})[0];
        const extract = page?.extract?.trim();
        if (!page || !extract || page.missing) return null;

        return { title: page.title ?? title, body: extract };
      }

      const wikihow = /https?:\/\/(?:www\.)?([a-z]+\.)?wikihow\.com\/([^?#]+)/i.exec(url);
      if (wikihow) {
        const host = wikihow[1] ? `${wikihow[1]}wikihow.com` : 'www.wikihow.com';
        const title = decodeURIComponent((wikihow[2] ?? '').replace(/-/g, ' '));
        const endpoint = new URL(`https://${host}/api.php`);
        endpoint.searchParams.set('action', 'parse');
        endpoint.searchParams.set('page', title);
        endpoint.searchParams.set('prop', 'text');
        endpoint.searchParams.set('format', 'json');
        endpoint.searchParams.set('origin', '*');
        endpoint.searchParams.set('redirects', '1');

        const body = await fetchJson<WikiHowParseResponse>(endpoint.toString());
        const raw = body?.parse?.text;
        const html = typeof raw === 'string' ? raw : raw?.['*'];
        if (!html) return null;
        const text = htmlToBody(html);
        if (text.length < 80) return null;

        return { title: body?.parse?.title ?? title, body: text };
      }

      const html = await fetchText(url);
      if (!html) return null;
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      const text = htmlToBody(html);
      if (text.length < 80) return null;

      return {
        title: titleMatch ? decodeURIComponent(htmlToBody(titleMatch[1] ?? '')) : url,
        body: text,
      };
    },
  };
}

export type ArticleProvider = ReturnType<typeof createArticleProvider>;
