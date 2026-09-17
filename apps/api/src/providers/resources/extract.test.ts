import { describe, expect, it } from 'vitest';
import { htmlToBody } from './extract';

describe('htmlToBody', () => {
  it('turns markup into paragraphs the reader can split', () => {
    const body = htmlToBody(
      '<html><head><style>p{color:red}</style></head><body><h1>Chord changes</h1><p>Move the whole hand.</p><p>Change on the beat.</p></body></html>',
    );

    expect(body).toContain('Chord changes');
    expect(body).toContain('Move the whole hand.');
    expect(body).toContain('Change on the beat.');
    expect(body).not.toContain('color:red');
    expect(body).not.toContain('<p>');
  });

  it('keeps list items as bullets', () => {
    expect(htmlToBody('<ul><li>One</li><li>Two</li></ul>')).toMatch(/• One[\s\S]*• Two/);
  });
});
