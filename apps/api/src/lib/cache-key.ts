import { createHash } from 'node:crypto';

/**
 * Search queries are normalized before hashing so that trivially different
 * phrasings share a cache entry. Two learners starting "beginner guitar chord
 * transitions" should cost one YouTube search, not two.
 */
export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

export function resourceCacheKey(text: string, language: string): string {
  const normalized = `${normalizeQuery(text)}|${language.toLowerCase()}`;

  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}
