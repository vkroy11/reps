import type { TechniqueContent } from '@reps/core';
import { fireEvent } from '@testing-library/react-native';
import { SessionInstructions } from '../src/features/practice/SessionInstructions';
import { renderScreen } from './support/render-screen';

const DRILL: TechniqueContent = {
  format: 'drill',
  steps: [
    'Strum G for four beats, then C for four beats.',
    'Set a metronome to 80bpm and change on the fourth beat.',
    'Run it ten times without stopping.',
  ],
  durationMinutes: 11,
  successCriteria: 'Ten changes with no buzzing and no pause longer than a beat.',
};

const CARDS: TechniqueContent = {
  format: 'flashcards',
  cards: [
    { front: 'Keyword to declare a variable', back: 'var' },
    { front: 'Keyword to define a function', back: 'func' },
    { front: 'Keyword to import packages', back: 'import' },
    { front: 'Zero value of a string', back: 'the empty string' },
    { front: 'Zero value of a pointer', back: 'nil' },
  ],
};

const LESSON_BODY = 'The hand travels as one shape. '.repeat(4);
const LESSON: TechniqueContent = {
  format: 'ai_lesson',
  title: 'Why chord changes stall',
  body: LESSON_BODY,
  keyPoints: ['Move the whole hand as a shape', 'Change on the beat, not after it'],
};

/**
 * The written instructions inside the session.
 *
 * The technique page has always held these, but a session is a different
 * route - so starting a drill meant memorising the steps first or backing out
 * mid-rep to re-read them.
 */
describe('SessionInstructions', () => {
  it('stays collapsed, so the timer keeps the screen', async () => {
    const { getByTestId, queryByText } = await renderScreen(
      <SessionInstructions content={DRILL} loading={false} />,
    );

    expect(getByTestId('instructions-toggle')).toBeOnTheScreen();
    expect(queryByText('Run it ten times without stopping.')).toBeNull();
  });

  it('says how much there is before it is opened', async () => {
    const { getByText } = await renderScreen(
      <SessionInstructions content={DRILL} loading={false} />,
    );

    expect(getByText('Step by step · 3 steps')).toBeOnTheScreen();
  });

  it('opens to the numbered steps', async () => {
    const { getByTestId, getByText } = await renderScreen(
      <SessionInstructions content={DRILL} loading={false} />,
    );

    await fireEvent.press(getByTestId('instructions-toggle'));

    expect(getByText('Strum G for four beats, then C for four beats.')).toBeOnTheScreen();
    expect(getByText('Run it ten times without stopping.')).toBeOnTheScreen();
  });

  /** The one thing a one-line practice prompt cannot carry. */
  it('says what finishing the drill means', async () => {
    const { getByTestId, getByText } = await renderScreen(
      <SessionInstructions content={DRILL} loading={false} />,
    );

    await fireEvent.press(getByTestId('instructions-toggle'));

    expect(
      getByText('Ten changes with no buzzing and no pause longer than a beat.'),
    ).toBeOnTheScreen();
  });

  it('closes again', async () => {
    const { getByTestId, queryByText } = await renderScreen(
      <SessionInstructions content={DRILL} loading={false} />,
    );

    await fireEvent.press(getByTestId('instructions-toggle'));
    await fireEvent.press(getByTestId('instructions-toggle'));

    expect(queryByText('Run it ten times without stopping.')).toBeNull();
  });

  describe('on a recall technique', () => {
    it('shows the deck, because the cards are the rep', async () => {
      const { getByTestId, getByText } = await renderScreen(
        <SessionInstructions content={CARDS} loading={false} />,
      );

      expect(getByText('The cards · 5')).toBeOnTheScreen();
      await fireEvent.press(getByTestId('instructions-toggle'));

      expect(getByText('Keyword to declare a variable')).toBeOnTheScreen();
      expect(getByText('var')).toBeOnTheScreen();
    });
  });

  describe('on a lesson', () => {
    it('shows the key points rather than the whole body', async () => {
      const { getByTestId, getByText, queryByText } = await renderScreen(
        <SessionInstructions content={LESSON} loading={false} />,
      );

      expect(getByText('2 key points')).toBeOnTheScreen();
      await fireEvent.press(getByTestId('instructions-toggle'));

      expect(getByText('Change on the beat, not after it')).toBeOnTheScreen();
      expect(queryByText(LESSON_BODY)).toBeNull();
    });
  });

  it('stands in while the instructions are being generated', async () => {
    const { queryByTestId } = await renderScreen(<SessionInstructions content={null} loading />);

    expect(queryByTestId('instructions-toggle')).toBeNull();
  });

  /** No panel at all rather than an empty one that never opens. */
  it('is absent when there are no instructions', async () => {
    const { queryByTestId } = await renderScreen(
      <SessionInstructions content={null} loading={false} />,
    );

    expect(queryByTestId('instructions-toggle')).toBeNull();
  });
});
