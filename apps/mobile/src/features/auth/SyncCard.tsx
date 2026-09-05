import { Button, Card, Text, color, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';
import { googleSignInConfigured } from '../../lib/google-oauth';
import { useApp } from '../../providers/app-provider';
import { useGoogleSignIn } from './useGoogleSignIn';

/**
 * Optional sign-in.
 *
 * The copy carries most of the weight here, because the honest answer to "why
 * would I sign in" is narrow: it moves your practice to another device. It
 * does not unlock anything, it is not required, and nothing is gated behind
 * it - so the card says that rather than implying a benefit that does not
 * exist.
 *
 * `serverAvailable` and the local client id have to agree. A build with an id
 * talking to a server without one would produce a token the API refuses, so
 * the button only appears when both sides can actually complete the exchange.
 */
export function SyncCard({ serverAvailable }: { serverAvailable: boolean | null }) {
  const { session, signOut } = useApp();

  if (session) {
    return (
      <Card>
        <Text variant="heading">Synced</Text>
        <Text variant="caption" tone="textSecondary" style={styles.line}>
          {session.email ?? session.name ?? 'Signed in'}. Your paths, notes and practice history
          follow you to any device you sign in on.
        </Text>
        {/* Named for what it does. "Sign out" would understate it: this
            device goes back to being anonymous and empty. */}
        <Button
          label="Unlink this device"
          variant="secondary"
          onPress={() => void signOut()}
          style={styles.action}
          testID="sign-out"
        />
        <Text variant="caption" tone="textSecondary" style={styles.line}>
          Nothing is deleted — signing in again brings it all back.
        </Text>
      </Card>
    );
  }

  /*
    Checked before the Google hook, not inside it.

    `useIdTokenAuthRequest` throws outright when the platform has no client id
    - "Client Id property `iosClientId` must be defined" - so on a build with
    no iOS client this card took the whole screen down rather than showing the
    "not configured" message it has for exactly that case. It cannot be a
    conditional hook, so the branch has to happen one component up.
  */
  if (!googleSignInConfigured() || serverAvailable === false) {
    return (
      <Card>
        <Text variant="heading">Sync across devices</Text>
        <Text variant="caption" tone="textSecondary" style={styles.line}>
          Not configured in this build — it needs a Google OAuth client id. Everything else works
          without it; your practice is saved either way.
        </Text>
      </Card>
    );
  }

  return <SignInCard serverAvailable={serverAvailable} />;
}

/** The half that needs the Google hook, reached only when it can run. */
function SignInCard({ serverAvailable }: { serverAvailable: boolean | null }) {
  const { status, signIn } = useGoogleSignIn();

  return (
    <Card>
      <Text variant="heading">Sync across devices</Text>
      <Text variant="caption" tone="textSecondary" style={styles.line}>
        Optional. Reps works fully without an account — signing in only lets you pick the same path
        up on another device.
      </Text>
      {/* The reassurance people actually need before tapping. */}
      <View style={styles.assurance}>
        <Text variant="caption" tone="progressText">
          Everything you have already done comes with you. Nothing is replaced.
        </Text>
      </View>

      <Button
        label={status.state === 'working' ? 'Opening Google…' : 'Continue with Google'}
        onPress={signIn}
        disabled={status.state === 'working' || serverAvailable === null}
        style={styles.action}
        testID="sign-in-google"
      />

      {status.state === 'failed' ? (
        <Text variant="caption" tone="dangerPressed" style={styles.line}>
          {status.message}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: space.xs, lineHeight: 18 },
  assurance: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: 12,
    backgroundColor: color.progressSoft,
  },
  action: { marginTop: space.base },
});
