import type { Resource } from '@reps/core';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { LearnPanel } from '../src/features/reader/LearnPanel';
import { paragraphsOf } from '../src/features/reader/paragraphs';
import { renderScreen } from './support/render-screen';

const ARTICLE: Resource = {
  id: 'res_article',
  techniqueId: 'tec_1',
  format: 'article',
  title: 'Why chord changes stall',
  url: 'https://www.wikihow.com/Change-Guitar-Chords',
  thumbnailUrl: null,
  source: 'wikiHow',
  durationSec: null,
  selectionReason: 'Walks through the change at beginner tempo.',
  body: 'Move the whole hand as a shape.\n\nChange on the beat, not after it.\n\nKeep the ring finger anchored.',
};

describe('paragraphsOf', () => {
  it('splits on blank lines so each block is tappable', () => {
    expect(paragraphsOf(ARTICLE.body ?? '')).toEqual([
      'Move the whole hand as a shape.',
      'Change on the beat, not after it.',
      'Keep the ring finger anchored.',
    ]);
  });
});

describe('LearnPanel', () => {
  it('lets a learner highlight a paragraph and turn it into a note', async () => {
    const onAddNote = jest.fn();
    const { getByTestId } = await renderScreen(
      <LearnPanel resources={[ARTICLE]} onAddNote={onAddNote} jumpTo={null} />,
    );

    fireEvent.press(getByTestId('article-p-1'));
    fireEvent.press(await waitFor(() => getByTestId('note-paragraph')));

    expect(onAddNote).toHaveBeenCalledWith({
      resourceId: 'res_article',
      timestampSec: 1,
      stamp: 'Change on the beat, not after it.',
      anchor: {
        kind: 'highlight',
        start: 1,
        quote: 'Change on the beat, not after it.',
      },
    });
  });

  it('keeps the original URL a tap away', async () => {
    const { getByTestId } = await renderScreen(
      <LearnPanel resources={[ARTICLE]} onAddNote={jest.fn()} jumpTo={null} />,
    );

    expect(getByTestId('open-original')).toBeOnTheScreen();
  });
});
