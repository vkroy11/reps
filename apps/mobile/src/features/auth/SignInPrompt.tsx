import { Button, Text, color, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';
import { googleSignInConfigured } from '../../lib/google-oauth';
import { useApp } from '../../providers/app-provider';
import { useAuthAvailable } from './useAuthAvailable';
import { useGoogleSignIn } from './useGoogleSignIn';

/**
 * Sign-in for somebody who already has an account and nothing on this device.
 *
 * The empty screen was a dead end for returning learners: the only thing on it
 * was "start a hobby", so the way to reach paths you already had was to build
 * a new one first, or to know that the Me tab existed. This is not a second
 * front door - the account is still optional and nothing is gated behind it -
 * it just stops the empty state from being wrong for the one group of people
 * most likely to be looking at it.
 *
 * Deliberately secondary. It sits below the primary action, in a ghost button,
 * and says outright that it is optional. A prominent sign-in on a first run
 * reads as a wall, and this app does not have one.
 */
export function SignInPrompt() {
  /*
    Before any hook, deliberately. `useIdTokenAuthRequest` throws when the
    platform has no client id, so this cannot be checked inside the component
    that uses it. The value comes from the app config and cannot change at
    runtime, so branching on it does not make the hooks below conditional.
  */
  if (!googleSignInConfigured()) return null;

  return <ConfiguredSignInPrompt />;
}

function ConfiguredSignInPrompt() {
  const { session } = useApp();
  const available = useAuthAvailable();
  const { status, signIn } = useGoogleSignIn();

  // Already signed in, so an empty screen means an empty account - offering
  // sign-in again would be nonsense.
  if (session) return null;
  // Unknown, or unsupported by the server: say nothing rather than offer a
  // button that cannot finish.
  if (available !== true) return null;

  return (
    <View style={styles.block} testID="signin-prompt">
      <View style={styles.rule} />

      <Text variant="caption" tone="textSecondary" center>
        Already used Reps somewhere else?
      </Text>

      <Button
        label={status.state === 'working' ? 'Signing in…' : 'Sign in with Google'}
        variant="secondary"
        onPress={signIn}
        disabled={status.state === 'working'}
        style={styles.action}
        testID="signin-from-today"
      />

      {status.state === 'failed' ? (
        <Text variant="caption" tone="dangerPressed" center>
          {status.message}
        </Text>
      ) : (
        <Text variant="caption" tone="textSecondary" center style={styles.optional}>
          Completely optional. Reps works fully without an account — this only brings paths you
          already have onto this device.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  /* A rule rather than a card: this is a footnote to the action above it. */
  rule: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: color.borderDefault,
    marginBottom: space.base,
  },
  action: { alignSelf: 'stretch' },
  optional: { maxWidth: 300 },
});
