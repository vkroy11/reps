import { fireEvent } from '@testing-library/react-native';
import { SignInPrompt } from '../src/features/auth/SignInPrompt';
import { renderScreen } from './support/render-screen';

let mockConfigured = true;
let mockSession: { userId: string; email: string | null } | null = null;
let mockAvailable: boolean | null = true;
const mockSignIn = jest.fn();
let mockStatus: { state: string; message?: string } = { state: 'idle' };

jest.mock('../src/lib/google-oauth', () => ({
  googleSignInConfigured: () => mockConfigured,
  googleClientId: () => (mockConfigured ? 'client-id.apps.googleusercontent.com' : null),
}));

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({ session: mockSession, api: null, ready: true }),
}));

jest.mock('../src/features/auth/useAuthAvailable', () => ({
  useAuthAvailable: () => mockAvailable,
}));

jest.mock('../src/features/auth/useGoogleSignIn', () => ({
  useGoogleSignIn: () => ({ status: mockStatus, signIn: mockSignIn, reset: jest.fn() }),
}));

/**
 * The empty screen used to be a dead end for anyone who already had an
 * account: the only thing on it was "start a hobby", so reaching paths you
 * already had meant building a new one first, or knowing the Me tab existed.
 */
describe('SignInPrompt', () => {
  beforeEach(() => {
    mockConfigured = true;
    mockSession = null;
    mockAvailable = true;
    mockStatus = { state: 'idle' };
    mockSignIn.mockClear();
  });

  it('offers sign-in to someone with nothing on this device', async () => {
    const { getByTestId, getByText } = await renderScreen(<SignInPrompt />);

    expect(getByTestId('signin-prompt')).toBeOnTheScreen();
    expect(getByText('Already used Reps somewhere else?')).toBeOnTheScreen();
  });

  /** The account is optional and nothing is gated behind it. Say so. */
  it('says plainly that it is optional', async () => {
    const { getByText } = await renderScreen(<SignInPrompt />);

    expect(getByText(/Completely optional/)).toBeOnTheScreen();
    expect(getByText(/works fully without an account/)).toBeOnTheScreen();
  });

  it('starts the flow when tapped', async () => {
    const { getByTestId } = await renderScreen(<SignInPrompt />);

    await fireEvent.press(getByTestId('signin-from-today'));

    expect(mockSignIn).toHaveBeenCalled();
  });

  it('reports a failure rather than looking like nothing happened', async () => {
    mockStatus = { state: 'failed', message: 'Your browser blocked the sign-in window.' };

    const { getByText } = await renderScreen(<SignInPrompt />);

    expect(getByText('Your browser blocked the sign-in window.')).toBeOnTheScreen();
  });

  describe('staying quiet', () => {
    /**
     * `useIdTokenAuthRequest` throws when the platform has no client id, so
     * this has to be checked before the hook runs - a build with no iOS client
     * would otherwise take the whole screen down.
     */
    it('renders nothing, and calls no auth hook, when the build has no client id', async () => {
      mockConfigured = false;

      const { queryByTestId } = await renderScreen(<SignInPrompt />);

      expect(queryByTestId('signin-prompt')).toBeNull();
    });

    it('says nothing while availability is unknown', async () => {
      mockAvailable = null;

      const { queryByTestId } = await renderScreen(<SignInPrompt />);

      expect(queryByTestId('signin-prompt')).toBeNull();
    });

    it('says nothing when the server cannot complete a sign-in', async () => {
      mockAvailable = false;

      const { queryByTestId } = await renderScreen(<SignInPrompt />);

      expect(queryByTestId('signin-prompt')).toBeNull();
    });

    /** An empty screen while signed in means an empty account, not a new one. */
    it('says nothing to someone already signed in', async () => {
      mockSession = { userId: 'usr_1', email: 'a@b.test' };

      const { queryByTestId } = await renderScreen(<SignInPrompt />);

      expect(queryByTestId('signin-prompt')).toBeNull();
    });
  });
});
