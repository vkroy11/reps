import type { FlashcardsContent } from '@reps/core';
import { fireEvent } from '@testing-library/react-native';
import { FlashcardDrill } from '../src/features/practice/FlashcardDrill';
import { renderScreen } from './support/render-screen';

const DECK: FlashcardsContent = {
  format: 'flashcards',
  cards: [
    { front: 'Keyword to declare a variable', back: 'var' },
    { front: 'Keyword to define a function', back: 'func' },
    { front: 'Zero value of a string', back: 'the empty string' },
    { front: 'Zero value of a pointer', back: 'nil' },
    { front: 'Keyword to import packages', back: 'import' },
  ],
};

/**
 * A deck is a retrieval exercise. Everything here is about protecting that:
 * the answer stays hidden until asked for, and grading is only offered once
 * the learner has had a go.
 */
describe('FlashcardDrill', () => {
  it('shows the question and keeps the answer hidden', async () => {
    const { getByText, queryByText } = await renderScreen(
      <FlashcardDrill content={DECK} onFinished={jest.fn()} />,
    );

    expect(getByText('Keyword to declare a variable')).toBeOnTheScreen();
    expect(queryByText('var')).toBeNull();
  });

  it('reveals the answer when the card is tapped', async () => {
    const { getByTestId, getByText } = await renderScreen(
      <FlashcardDrill content={DECK} onFinished={jest.fn()} />,
    );

    await fireEvent.press(getByTestId('deck-card'));

    expect(getByText('var')).toBeOnTheScreen();
  });

  /** Grading before attempting is how a deck quietly stops working. */
  it('offers no grades until the card has been turned over', async () => {
    const { getByTestId, queryByTestId } = await renderScreen(
      <FlashcardDrill content={DECK} onFinished={jest.fn()} />,
    );

    expect(queryByTestId('grade-got')).toBeNull();
    await fireEvent.press(getByTestId('deck-card'));
    expect(queryByTestId('grade-got')).toBeOnTheScreen();
  });

  it('moves to the next card once graded, face down again', async () => {
    const { getByTestId, getByText, queryByText } = await renderScreen(
      <FlashcardDrill content={DECK} onFinished={jest.fn()} />,
    );

    await fireEvent.press(getByTestId('deck-card'));
    await fireEvent.press(getByTestId('grade-got'));

    expect(getByText('Keyword to define a function')).toBeOnTheScreen();
    // The next card must not arrive already revealed.
    expect(queryByText('func')).toBeNull();
    expect(getByText('2/5')).toBeOnTheScreen();
  });

  describe('finishing the deck', () => {
    /** Walks the whole deck, grading every card the same way. */
    async function playThrough(
      screen: Awaited<ReturnType<typeof renderScreen>>,
      grade: 'again' | 'almost' | 'got',
      count: number,
    ) {
      for (let card = 0; card < count; card += 1) {
        await fireEvent.press(screen.getByTestId('deck-card'));
        await fireEvent.press(screen.getByTestId(`grade-${grade}`));
      }
    }

    it('reports the tally when the last card is graded', async () => {
      const onFinished = jest.fn();
      const screen = await renderScreen(<FlashcardDrill content={DECK} onFinished={onFinished} />);

      await playThrough(screen, 'got', DECK.cards.length);

      expect(onFinished).toHaveBeenCalledWith({ again: 0, almost: 0, got: 5 });
      expect(screen.getByText('Deck done')).toBeOnTheScreen();
    });

    it('says how many were instant and how many are coming back', async () => {
      const screen = await renderScreen(<FlashcardDrill content={DECK} onFinished={jest.fn()} />);

      await playThrough(screen, 'again', DECK.cards.length);

      expect(screen.getByText(/0 of 5 instant · 5 coming back around/)).toBeOnTheScreen();
    });

    /**
     * "Almost" counts as missed. A card the learner had to dig for is not
     * known yet, and treating it as known is the failure mode of a two-button
     * deck.
     */
    it('brings back the ones that were slow, not just the ones that were wrong', async () => {
      const screen = await renderScreen(<FlashcardDrill content={DECK} onFinished={jest.fn()} />);

      await playThrough(screen, 'almost', DECK.cards.length);

      expect(screen.getByTestId('deck-review-missed')).toBeOnTheScreen();
      expect(screen.getByText('Review the 5 you missed')).toBeOnTheScreen();
    });

    it('offers no review when every card was instant', async () => {
      const screen = await renderScreen(<FlashcardDrill content={DECK} onFinished={jest.fn()} />);

      await playThrough(screen, 'got', DECK.cards.length);

      expect(screen.queryByTestId('deck-review-missed')).toBeNull();
    });

    it('restarts with only the missed cards', async () => {
      const screen = await renderScreen(<FlashcardDrill content={DECK} onFinished={jest.fn()} />);

      // First two wrong, the rest instant.
      await playThrough(screen, 'again', 2);
      await playThrough(screen, 'got', 3);
      await fireEvent.press(screen.getByTestId('deck-review-missed'));

      expect(screen.getByText('1/2')).toBeOnTheScreen();
      expect(screen.getByText('Keyword to declare a variable')).toBeOnTheScreen();
    });
  });
});
