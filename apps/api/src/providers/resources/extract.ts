import { decodeHtml } from './youtube.provider';

const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT = 'Reps/0.1 (hobby practice paths; https://github.com/vkroy11/reps)';

export interface ExtractedArticle {
  title: string;
  body: string;
}

/**
 * Turns HTML into the paragraph list the in-app reader actually renders.
 *
 * Kept here rather than in a library: we only need titles, headings and
 * paragraphs, and a general HTML parser would be an attack surface for pages
 * we did not choose.
 */
export function htmlToBody(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const withBreaks = withoutNoise
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n\n');

  const text = decodeHtml(withBreaks.replace(/<[^>]+>/g, ' '));

  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export async function fetchText(url: string): Promise<string | null> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  return response.text();
}

export async function fetchJson<T>(url: string): Promise<T | null> {
  const text = await fetchText(url);
  if (text === null) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export { USER_AGENT };
