import { blocksOf } from '../src/features/reader/blocks';
import { plainText } from '../src/features/reader/MarkdownBlock';

const LESSON = `Use a 2-D table \`dp[i][j]\` to store subproblem solutions.

**Practice problems** (solve each in 5 min).

1. **Longest Common Subsequence (LCS)** – strings \`A\` and \`B\`.
   *Recurrence:* \`dp[i][j]\`.
   *Python snippet:*
   python
   dp = [[0]*(m+1) for _ in range(n+1)]
   for i in range(1,n+1):
       for j in range(1,m+1):
           dp[i][j] = 1

2. **Edit Distance** – strings \`S\` and \`T\`.

\`\`\`mermaid
flowchart TD
  A[Subproblem] --> B[Fill table]
  B --> C[Read dp n m]
\`\`\`
`;

describe('blocksOf', () => {
  it('keeps a python snippet as one code block, not broken paragraphs', () => {
    const blocks = blocksOf(LESSON);
    const code = blocks.find((block) => block.type === 'code');

    expect(code).toMatchObject({ type: 'code', language: 'python' });
    if (code?.type === 'code') {
      expect(code.code).toContain('dp = [[0]*(m+1)');
      expect(code.code).toContain('for i in range');
    }
  });

  it('lifts a mermaid fence into a diagram', () => {
    const blocks = blocksOf(LESSON);
    const diagram = blocks.find((block) => block.type === 'diagram');

    expect(diagram).toMatchObject({ type: 'diagram' });
    if (diagram?.type === 'diagram') {
      expect(diagram.source).toContain('flowchart TD');
    }
  });
});

describe('plainText', () => {
  it('drops markdown markers so a note quote is readable', () => {
    expect(plainText('**Edit Distance** uses `dp[i][j]`')).toBe('Edit Distance uses dp[i][j]');
  });
});
