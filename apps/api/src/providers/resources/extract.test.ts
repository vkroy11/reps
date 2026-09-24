import { describe, expect, it } from 'vitest';
import { htmlToBody, htmlToMarkdown } from './extract';

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

describe('htmlToMarkdown', () => {
  it('keeps bold and italic as markdown the reader can render', () => {
    const body = htmlToMarkdown('<p>Move the <b>whole hand</b> as a <i>shape</i>.</p>');

    expect(body).toContain('**whole hand**');
    expect(body).toContain('*shape*');
    expect(body).not.toContain('<b>');
  });

  it('keeps diagrams large enough to be useful, as markdown images', () => {
    const body = htmlToMarkdown(
      '<p>See this.</p><img src="//upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Chord.png" alt="Chord diagram" width="220">',
      'https://en.wikipedia.org/wiki/Chord',
    );

    expect(body).toContain(
      '![Chord diagram](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Chord.png)',
    );
  });

  it('drops tracking pixels and tiny icons', () => {
    const body = htmlToMarkdown(
      '<img src="https://example.test/pixel.gif" width="1" height="1"><img src="https://example.test/icon-share.png" width="16">',
    );

    expect(body).not.toContain('![');
  });
});
