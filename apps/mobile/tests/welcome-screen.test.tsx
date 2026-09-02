import { emptyDraft, type OnboardingDraft } from '@reps/client';
import { fireEvent } from '@testing-library/react-native';
import WelcomeScreen from '../src/app/index';
import { renderScreen } from './support/render-screen';

const mockPush = jest.fn();
const mockClearDraft = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

let mockDraft: OnboardingDraft = emptyDraft;
let mockReady = true;

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({
    draft: mockDraft,
    ready: mockReady,
    clearDraft: mockClearDraft,
    api: null,
    patchDraft: jest.fn(),
    loadSuggestions: jest.fn(),
  }),
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockClearDraft.mockClear();
    mockDraft = emptyDraft;
    mockReady = true;
  });

  it('offers a single way in when there is nothing saved', async () => {
    const { getByTestId, queryByTestId } = await renderScreen(<WelcomeScreen />);

    expect(getByTestId('get-started')).toBeOnTheScreen();
    expect(queryByTestId('resume')).toBeNull();
  });

  it('starts onboarding at the first question', async () => {
    const { getByTestId } = await renderScreen(<WelcomeScreen />);

    await fireEvent.press(getByTestId('get-started'));

    expect(mockPush).toHaveBeenCalledWith('/onboarding/skill');
  });

  /** A persisted draft is the whole point of saving after every answer. */
  it('resumes a saved draft at the first unanswered question', async () => {
    mockDraft = { skill: 'guitar', goal: 'play 5 songs at a campfire' };

    const { getByTestId } = await renderScreen(<WelcomeScreen />);
    await fireEvent.press(getByTestId('resume'));

    // skill and goal are answered, so level is next.
    expect(mockPush).toHaveBeenCalledWith('/onboarding/level');
  });

  it('names the skill being resumed', async () => {
    mockDraft = { skill: 'chess' };

    const { getByText } = await renderScreen(<WelcomeScreen />);

    expect(getByText('Continue with chess')).toBeOnTheScreen();
  });

  /**
   * Regression: this used to clear the draft on tap, sitting directly under
   * the primary button. Changing skill is handled by the skill screen instead.
   */
  it('does not destroy anything when picking a different skill', async () => {
    mockDraft = { skill: 'guitar' };

    const { getByText } = await renderScreen(<WelcomeScreen />);
    await fireEvent.press(getByText('Pick a different skill'));

    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/onboarding/skill');
  });

  /** Storage is async, so the resume affordance must not flash in before it loads. */
  it('does not offer resume until storage has been read', async () => {
    mockDraft = { skill: 'guitar' };
    mockReady = false;

    const { queryByTestId, getByTestId } = await renderScreen(<WelcomeScreen />);

    expect(queryByTestId('resume')).toBeNull();
    expect(getByTestId('get-started')).toBeOnTheScreen();
  });
});
