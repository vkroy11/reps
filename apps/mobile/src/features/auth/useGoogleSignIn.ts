import { ApiError } from '@reps/client';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { googleClientId } from '../../lib/google-oauth';
import { useApp } from '../../providers/app-provider';

export type SignInStatus =
  | { state: 'unconfigured' }
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'failed'; message: string }
  | { state: 'done'; claimed: boolean };

/**
 * Google sign-in, and the claim that follows it.
 *
 * Asks for an **ID token** rather than an access token. An access token would
 * let the server call Google's APIs on the learner's behalf, which is more
 * authority than this needs - all we want is proof of who they are, which is
 * exactly what an ID token is, and it is verifiable offline against Google's
 * published keys.
 *
 * The flow is: Google returns a token to the app, the app posts it to our API,
 * the API verifies it and answers with a session of our own. We never hold a
 * Google credential beyond the moment of exchange.
 */
/**
 * Where Google sends a native sign-in back to.
 *
 * Stated rather than inferred. The library only derives
 * `<applicationId>:/oauthredirect` when `Constants.executionEnvironment` is
 * standalone or bare - anywhere else it falls back to a `Linking.createURL`
 * value, which in a development build is an `exp://` address that Google
 * rejects outright with `invalid_request`. Naming it here means the redirect
 * is the same in a dev build, a preview APK and a store build.
 *
 * Undefined on web, so the library computes the origin-based one there.
 */
function nativeRedirectUri(): string | undefined {
  if (Platform.OS === 'web') return undefined;

  const applicationId =
    Platform.OS === 'android'
      ? Constants.expoConfig?.android?.package
      : Constants.expoConfig?.ios?.bundleIdentifier;

  return applicationId ? `${applicationId}:/oauthredirect` : undefined;
}

export function useGoogleSignIn(): {
  status: SignInStatus;
  signIn: () => void;
  reset: () => void;
} {
  const { api, signedIn, applySession } = useApp();
  const clientId = googleClientId();
  const [status, setStatus] = useState<SignInStatus>(
    clientId === null ? { state: 'unconfigured' } : { state: 'idle' },
  );

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: clientId ?? undefined,
    redirectUri: nativeRedirectUri(),
  });

  // The redirect can resolve after a remount, so the exchange is guarded
  // rather than assumed to run once.
  const exchanged = useRef<string | null>(null);

  useEffect(() => {
    if (!api || !response) return;

    if (response.type === 'dismiss' || response.type === 'cancel') {
      setStatus({ state: 'idle' });

      return;
    }

    if (response.type === 'error') {
      setStatus({
        state: 'failed',
        message: response.error?.message ?? 'Google sign-in did not complete.',
      });

      return;
    }

    if (response.type !== 'success') return;

    const idToken = response.params.id_token;
    if (!idToken || exchanged.current === idToken) return;

    exchanged.current = idToken;
    setStatus({ state: 'working' });

    void (async () => {
      try {
        const session = await api.signInWithGoogle(idToken);
        await applySession(session);
        setStatus({ state: 'done', claimed: session.claimed });
      } catch (error) {
        setStatus({
          state: 'failed',
          message:
            error instanceof ApiError && error.code === 'NetworkError'
              ? 'Signed in with Google, but Reps could not be reached. Nothing was lost — try again when you have a connection.'
              : 'Reps could not accept that sign-in.',
        });
      }
    })();
  }, [api, response, applySession]);

  const signIn = useCallback(() => {
    if (clientId === null) return;

    setStatus({ state: 'working' });
    /*
      promptAsync rejects rather than resolving when a browser blocks the
      popup, which is common on mobile web. Left unhandled that was an
      unhandled rejection and a button stuck on "Signing in..." for ever - the
      one outcome worse than failing, because nothing tells the learner to
      try again.
    */
    promptAsync().catch((error: unknown) => {
      setStatus({
        state: 'failed',
        message:
          error instanceof Error && error.message.includes('blocked')
            ? 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'
            : 'Google sign-in could not be opened.',
      });
    });
  }, [clientId, promptAsync]);

  const reset = useCallback(() => {
    setStatus(clientId === null ? { state: 'unconfigured' } : { state: 'idle' });
  }, [clientId]);

  return { status: signedIn ? { state: 'done', claimed: false } : status, signIn, reset };
}
