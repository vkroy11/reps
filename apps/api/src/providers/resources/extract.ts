import { decodeHtml } from './youtube.provider';

const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT = 'Reps/0.1 (hobby practice paths; https://github.com/vkroy11/reps)';
const MIN_IMAGE_PX = 80;

export interface ExtractedArticle {
  title: string;
  body: string;
}

/**
 * Search snippets: plain text, no images. The ranker only needs a line or two.
 */
export function htmlToBody(html: string): string {
  return stripMarkdownImages(htmlToMarkdown(html)).replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Turns HTML into the markdown the in-app reader renders: headings, bold,
 * italic, and images large enough to be a diagram rather than a tracking pixel.
 */
export function htmlToMarkdown(html: string, baseUrl?: string): string {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[\s\S]*?<\/sup>/gi, '')
    .replace(/<span\b[^>]*class="[^"]*mw-editsection[^"]*"[\s\S]*?<\/span>/gi, '');

  const withMarkdown = withoutNoise
    .replace(/<img\b[^>]*>/gi, (tag) => markdownImage(tag, baseUrl))
    .replace(/<h([1-6])\b[^>]*>/gi, (_match, level: string) => `\n\n${'#'.repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<(strong|b)\b[^>]*>/gi, '**')
    .replace(/<\/(strong|b)>/gi, '**')
    .replace(/<(em|i)\b[^>]*>/gi, '*')
    .replace(/<\/(em|i)>/gi, '*')
    .replace(/<\/(p|div|figure|figcaption|li|tr|blockquote|section)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ');

  const text = decodeHtml(withMarkdown.replace(/<[^>]+>/g, ' '));

  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\*\*\s+\*\*/g, '')
    .trim();
}

function markdownImage(tag: string, baseUrl?: string): string {
  const src =
    attr(tag, 'src') ??
    attr(tag, 'data-src') ??
    attr(tag, 'data-image-src') ??
    firstSrcsetUrl(attr(tag, 'srcset') ?? attr(tag, 'data-srcset'));

  if (!src || src.startsWith('data:')) return '';

  const width = parsePx(attr(tag, 'width'));
  const height = parsePx(attr(tag, 'height'));
  if ((width !== null && width < MIN_IMAGE_PX) || (height !== null && height < MIN_IMAGE_PX)) {
    return '';
  }

  const resolved = resolveUrl(src, baseUrl);
  if (!resolved || !isUsefulImage(resolved)) return '';

  const alt = attr(tag, 'alt') ?? 'Illustration';

  return `\n\n![${alt}](${resolved})\n\n`;
}

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  const value = match?.[2] ?? match?.[3];

  return value && value.length > 0 ? value : null;
}

function firstSrcsetUrl(srcset: string | null): string | null {
  if (!srcset) return null;
  const first = srcset.split(',')[0]?.trim().split(/\s+/)[0];

  return first && first.length > 0 ? first : null;
}

function parsePx(value: string | null): number | null {
  if (!value) return null;
  const number = Number.parseInt(value, 10);

  return Number.isFinite(number) ? number : null;
}

function resolveUrl(src: string, baseUrl?: string): string | null {
  if (src.startsWith('//')) return `https:${src}`;
  if (/^https?:\/\//i.test(src)) return src;
  if (!baseUrl) return null;

  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

function isUsefulImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\.(svg)(\?|$)/.test(lower)) return false;
  if (/(sprite|pixel|1x1|spacer|tracking|badge\.|icon[-_/])/.test(lower)) return false;

  return true;
}

function stripMarkdownImages(markdown: string): string {
  return markdown.replace(/!\[[^\]]*]\([^)]+\)/g, '').trim();
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
