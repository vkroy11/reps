import type { OnboardingSuggestions } from '@reps/core';
import { act, fireEvent } from '@testing-library/react-native';
import FormatsScreen from '../src/app/onboarding/formats';
import GoalScreen from '../src/app/onboarding/goal';
import SkillScreen from '../src/app/onboarding/skill';
import TimeScreen from '../src/app/onboarding/time';
import { renderScreen } from './support/render-screen';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

const mockPatchDraft = jest.fn();
let mockDraft: Record<string, unknown> = {};

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({ draft: mockDraft, patchDraft: mockPatchDraft, api: null, ready: true }),
}));

let mockSuggestions: {
  data: OnboardingSuggestions | null;
  loading: boolean;
  error: { code: string } | null;
};

jest.mock('../src/features/onboarding/useSuggestions', () => ({
  useSuggestions: () => ({ ...mockSuggestions, retry: jest.fn() }),
}));

const SUGGESTIONS: OnboardingSuggestions = {
  archetype: 'motor',
  goals: [
    { label: 'Play five songs start to finish', description: 'Reps picks what those songs need.' },
    { label: 'Busk one full set', description: 'Memory and stamina weigh heavier.' },
    { label: 'Jam along by ear', description: 'More ear training, fewer chord charts.' },
  ],
  levels: [
    { label: 'Never really played it', description: 'We start at one clean chord.' },
    { label: 'Open chords, slow changes', description: 'The path starts at transitions.' },
    { label: 'Strum fine, want fingerstyle', description: 'We open at picking patterns.' },
  ],
};

describe('the immersive questionnaire', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockPatchDraft.mockClear();
    mockDraft = {};
    mockSuggestions = { data: SUGGESTIONS, loading: false, error: null };
    jest.useRealTimers();
  });

  describe('the skill step', () => {
    it('will not continue on a single letter', async () => {
      const { getByTestId } = await renderScreen(<SkillScreen />);

      await fireEvent.changeText(getByTestId('skill-input'), 'g');
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('fills the field from a popular chip', async () => {
      const { getByTestId } = await renderScreen(<SkillScreen />);

      await fireEvent.press(getByTestId('skill-Chess'));
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith(
        expect.objectContaining({ skill: 'Chess' }),
      );
    });

    /** The goal and level are written for the skill, so they cannot outlive it. */
    it('drops the derived answers when the skill actually changes', async () => {
      mockDraft = { skill: 'guitar', goal: 'play 5 songs', level: 'a few chords' };
      const { getByTestId } = await renderScreen(<SkillScreen />);

      await fireEvent.changeText(getByTestId('skill-input'), 'chess');
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({
        skill: 'chess',
        goal: undefined,
        level: undefined,
      });
    });

    it('keeps them when the skill is only recapitalised', async () => {
      mockDraft = { skill: 'guitar', goal: 'play 5 songs', level: 'a few chords' };
      const { getByTestId } = await renderScreen(<SkillScreen />);

      await fireEvent.changeText(getByTestId('skill-input'), 'Guitar');
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({ skill: 'Guitar' });
    });

    it('goes to the goal question', async () => {
      const { getByTestId } = await renderScreen(<SkillScreen />);

      await fireEvent.changeText(getByTestId('skill-input'), 'guitar');
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPush).toHaveBeenCalledWith('/onboarding/goal');
    });
  });

  describe('a suggestion step', () => {
    it('shows what each answer does to the path, not just its name', async () => {
      const { getByText } = await renderScreen(<GoalScreen />);

      expect(getByText('Reps picks what those songs need.')).toBeOnTheScreen();
    });

    it('advances by itself after a tap, without touching the CTA', async () => {
      jest.useFakeTimers();
      const { getByTestId } = await renderScreen(<GoalScreen />);

      await fireEvent.press(getByTestId('option-Busk one full set'));
      expect(mockPush).not.toHaveBeenCalled();

      // The pause exists so the tick is seen landing on the chosen card.
      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockPatchDraft).toHaveBeenCalledWith({ goal: 'Busk one full set' });
      expect(mockPush).toHaveBeenCalledWith('/onboarding/cheer1');
    });

    /**
     * The three suggestions are a shortcut, not the vocabulary. Without this
     * the model's guess silently becomes the product's limit.
     */
    it('takes an answer that is not on the list', async () => {
      const { getByTestId } = await renderScreen(<GoalScreen />);

      await fireEvent.press(getByTestId('option-custom'));
      await fireEvent.changeText(getByTestId('custom-answer'), 'learn every Radiohead b-side');
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({ goal: 'learn every Radiohead b-side' });
    });

    it('does not auto-advance out of the free-text field', async () => {
      const { getByTestId } = await renderScreen(<GoalScreen />);

      await fireEvent.press(getByTestId('option-custom'));

      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('custom-answer')).toBeOnTheScreen();
    });

    it('refuses a blank free-text answer', async () => {
      const { getByTestId } = await renderScreen(<GoalScreen />);

      await fireEvent.press(getByTestId('option-custom'));
      await fireEvent.changeText(getByTestId('custom-answer'), '  ');
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).not.toHaveBeenCalled();
    });

    /** A failed request must not close the only remaining way to answer. */
    it('still offers free text when the suggestions fail', async () => {
      mockSuggestions = { data: null, loading: false, error: { code: 'RateLimited' } };
      const { getByTestId } = await renderScreen(<GoalScreen />);

      await fireEvent.press(getByTestId('option-custom'));
      await fireEvent.changeText(getByTestId('custom-answer'), 'play at an open mic');
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({ goal: 'play at an open mic' });
    });

    it('offers nothing to tap while the options are still loading', async () => {
      mockSuggestions = { data: null, loading: true, error: null };
      const { queryByTestId } = await renderScreen(<GoalScreen />);

      expect(queryByTestId('option-custom')).toBeNull();
    });
  });

  describe('the time step', () => {
    it('starts from a sensible answer rather than nothing', async () => {
      const { getByText } = await renderScreen(<TimeScreen />);

      expect(getByText('20')).toBeOnTheScreen();
      expect(getByText('5 sessions of 20 min — 1 hr 40 min a week')).toBeOnTheScreen();
    });

    it('restates the week when the days change', async () => {
      const { getByTestId, getByText } = await renderScreen(<TimeScreen />);

      await fireEvent.press(getByTestId('days-3'));

      expect(getByText('3 sessions of 20 min — 1 hr a week')).toBeOnTheScreen();
    });

    it('saves both answers together', async () => {
      const { getByTestId } = await renderScreen(<TimeScreen />);

      await fireEvent.press(getByTestId('days-6'));
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({ dailyMinutes: 20, daysPerWeek: 6 });
    });
  });

  describe('the formats step', () => {
    /** Formats are genuinely optional: empty means "no preference". */
    it('lets the last question through with nothing selected', async () => {
      const { getByTestId } = await renderScreen(<FormatsScreen />);

      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({ preferredFormats: [], language: 'en' });
      expect(mockReplace).toHaveBeenCalledWith('/generating');
    });

    it('collects several formats and a language', async () => {
      const { getByTestId } = await renderScreen(<FormatsScreen />);

      await fireEvent.press(getByTestId('format-video'));
      await fireEvent.press(getByTestId('format-drill'));
      await fireEvent.press(getByTestId('language-hi'));
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({
        preferredFormats: ['video', 'drill'],
        language: 'hi',
      });
    });

    it('deselects a format on a second tap', async () => {
      const { getByTestId } = await renderScreen(<FormatsScreen />);

      await fireEvent.press(getByTestId('format-video'));
      await fireEvent.press(getByTestId('format-video'));
      await fireEvent.press(getByTestId('onboarding-continue'));

      expect(mockPatchDraft).toHaveBeenCalledWith({ preferredFormats: [], language: 'en' });
    });

    /**
     * The format-versus-skill override is the product's whole argument, so it
     * is stated where the preference is given rather than sprung later.
     */
    it('says up front that a skill can override the preference', async () => {
      const { getByText } = await renderScreen(<FormatsScreen />);

      expect(getByText(/Reps says so and shows you a demo instead/)).toBeOnTheScreen();
    });
  });
});
