import { Button, Text, color, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';
import { googleSignInConfigured } from '../../lib/google-oauth';
import { useApp } from '../../providers/app-provider';
import { useAuthAvailable } from './useAuthAvailable';
import { useGoogleSignIn } from './useGoogleSignIn';

export interface SignInPromptProps {
  /**
   * Welcome is a first-run choice (sign in or start a skill). Empty is the
   * returning-learner footnote on Today.
   */
  placement?: 'welcome' | 'empty';
}

/**
 * Sign in with Google, next to "start a skill" rather than behind it.
 *
 * Shown whenever this build has a client id and the learner is not already
 * signed in. Waiting on the API to confirm used to hide the button on first
 * launch (and whenever Render was asleep), which is how a new device had no
 * way to log in.
 */
export function SignInPrompt({ placement = 'empty' }: SignInPromptProps) {
  /*
    Before any hook, deliberately. `useIdTokenAuthRequest` throws when the
    platform has no client id, so this cannot be checked inside the component
    that uses it. The value comes from the app config and cannot change at
    runtime, so branching on it does not make the hooks below conditional.
  */
  if (!googleSignInConfigured()) return null;

  return <ConfiguredSignInPrompt placement={placement} />;
}

function ConfiguredSignInPrompt({ placement }: { placement: 'welcome' | 'empty' }) {
  const { session } = useApp();
  const available = useAuthAvailable();
  const { status, signIn } = useGoogleSignIn();

  if (session) return null;
  // Server has said it cannot finish a sign-in. Stay quiet rather than offer
  // a button that 503s. Unknown (still loading, or the API is waking) still
  // shows — first launch must not wait on that.
  if (available === false) return null;

  const welcome = placement === 'welcome';

  return (
    <View style={styles.block} testID="signin-prompt">
      {welcome ? null : <View style={styles.rule} />}

      <Text variant="caption" tone="textSecondary" center>
        {welcome ? 'Already have an account?' : 'Already used Reps somewhere else?'}
      </Text>

      <Button
        label={status.state === 'working' ? 'Signing in…' : 'Sign in with Google'}
        variant={welcome ? 'secondary' : 'secondary'}
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
          {welcome
            ? 'Or start a skill without one. Sign-in is optional — it only brings paths you already have onto this device.'
            : 'Completely optional. Reps works fully without an account — this only brings paths you already have onto this device.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  rule: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: color.borderDefault,
    marginBottom: space.base,
  },
  action: { alignSelf: 'stretch' },
  optional: { maxWidth: 320 },
});
