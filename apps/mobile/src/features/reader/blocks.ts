export type ArticleBlock =
  | { type: 'text'; markdown: string }
  | { type: 'heading'; level: number; markdown: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'diagram'; source: string }
  | { type: 'image'; alt: string; url: string };

const LANGUAGES = new Set([
  'python',
  'py',
  'javascript',
  'js',
  'typescript',
  'ts',
  'tsx',
  'java',
  'go',
  'rust',
  'c',
  'cpp',
  'c++',
  'sql',
  'bash',
  'sh',
  'ruby',
  'swift',
  'kotlin',
  'json',
  'html',
  'css',
]);

const IMAGE = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/;
const HEADING = /^(#{1,3})\s+(.+)$/;
const FENCE = /^```(\w+)?\s*$/;

/**
 * Split a lesson into the units the reader actually paints: prose, headings,
 * fenced (or "python\ncode") blocks, mermaid diagrams and images.
 *
 * Blank-line splitting is not enough. Generated lessons put a language name
 * on its own line and the snippet underneath, and `\n\n` inside the snippet
 * would otherwise turn a function into three broken paragraphs.
 */
export function blocksOf(body: string): ArticleBlock[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: ArticleBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const fence = FENCE.exec(line.trim());
    if (fence) {
      const language = (fence[1] ?? '').toLowerCase();
      const collected: string[] = [];
      index += 1;
      while (index < lines.length && !FENCE.test((lines[index] ?? '').trim())) {
        collected.push(lines[index] ?? '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      const code = collected.join('\n').trimEnd();
      if (language === 'mermaid') blocks.push({ type: 'diagram', source: code });
      else blocks.push({ type: 'code', language: language || 'code', code });
      continue;
    }

    const languageLine = line.trim().toLowerCase();
    if (LANGUAGES.has(languageLine) && looksLikeCodeStart(lines[index + 1])) {
      const collected: string[] = [];
      index += 1;
      while (index < lines.length) {
        const next = lines[index] ?? '';
        if (isSectionStart(next) && collected.length > 0) break;
        if (next.trim() === '' && isSectionStart(lines[index + 1] ?? '')) break;
        collected.push(dedent(next));
        index += 1;
      }
      blocks.push({
        type: 'code',
        language: languageLine,
        code: collected.join('\n').replace(/\s+$/, ''),
      });
      continue;
    }

    const image = IMAGE.exec(line.trim());
    if (image) {
      blocks.push({ type: 'image', alt: image[1] ?? '', url: image[2] ?? '' });
      index += 1;
      continue;
    }

    const heading = HEADING.exec(line.trim());
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]?.length ?? 1,
        markdown: heading[2] ?? '',
      });
      index += 1;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index] ?? '';
      if (next.trim() === '') break;
      if (FENCE.test(next.trim())) break;
      if (LANGUAGES.has(next.trim().toLowerCase()) && looksLikeCodeStart(lines[index + 1])) break;
      if (IMAGE.test(next.trim()) || HEADING.test(next.trim())) break;
      paragraph.push(next);
      index += 1;
    }
    blocks.push({ type: 'text', markdown: paragraph.join('\n').trim() });
  }

  return blocks;
}

/** Text-only split, for callers that still think in paragraphs. */
export function paragraphsOf(body: string): string[] {
  return blocksOf(body)
    .filter((block) => block.type === 'text' || block.type === 'heading')
    .map((block) => (block.type === 'heading' ? block.markdown : block.markdown));
}

function looksLikeCodeStart(line: string | undefined): boolean {
  if (line === undefined) return false;
  const trimmed = line.trim();
  if (trimmed === '') return true;

  return /^(dp\s*=|for |if |elif |else:|def |class |const |let |var |import |from |while |return |switch |case |[{}()]|\/\/|#include|public |private )/.test(
    trimmed,
  );
}

function isSectionStart(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === '') return false;

  return (
    /^\d+\.\s/.test(trimmed) ||
    /^#{1,3}\s/.test(trimmed) ||
    /^•\s/.test(trimmed) ||
    /^\*\*[^*]+\*\*/.test(trimmed)
  );
}

function dedent(line: string): string {
  return line.replace(/^ {0,4}/, '');
}
