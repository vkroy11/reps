import { emptyDraft, type OnboardingDraft } from '@reps/client';
import { fireEvent } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';
import WelcomeScreen from '../src/app/index';
import { renderScreen } from './support/render-screen';

const mockPush = jest.fn();
const mockClearDraft = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
  // Stands in for the real navigation so the destination is assertable.
  Redirect: ({ href }: { href: string }) => <MockText testID="redirect">{href}</MockText>,
}));

let mockDraft: OnboardingDraft = emptyDraft;
let mockReady = true;
let mockOnboarded = false;

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({
    draft: mockDraft,
    ready: mockReady,
    onboarded: mockOnboarded,
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
    mockOnboarded = false;
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

  describe('once a path has been built', () => {
    beforeEach(() => {
      mockOnboarded = true;
    });

    it('opens on Today instead of the welcome copy', async () => {
      const { getByTestId, queryByTestId } = await renderScreen(<WelcomeScreen />);

      expect(getByTestId('redirect')).toHaveTextContent('/(tabs)');
      expect(queryByTestId('get-started')).toBeNull();
    });

    /** A half-finished second path must not send a returning learner backwards. */
    it('redirects even with a draft in progress', async () => {
      mockDraft = { skill: 'chess' };

      const { getByTestId, queryByTestId } = await renderScreen(<WelcomeScreen />);

      expect(getByTestId('redirect')).toHaveTextContent('/(tabs)');
      expect(queryByTestId('resume')).toBeNull();
    });
  });

  /**
   * Storage is async and decides which screen the app opens on, so nothing may
   * paint until it has been read - rendering the welcome copy and redirecting
   * afterwards is the flash this avoids.
   */
  it('renders nothing until storage has been read', async () => {
    mockDraft = { skill: 'guitar' };
    mockOnboarded = true;
    mockReady = false;

    const { queryByTestId } = await renderScreen(<WelcomeScreen />);

    expect(queryByTestId('redirect')).toBeNull();
    expect(queryByTestId('get-started')).toBeNull();
    expect(queryByTestId('resume')).toBeNull();
  });
});
