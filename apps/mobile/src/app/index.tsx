import { firstIncompleteStep } from '@reps/client';
import { Button, PipLogo, Text, color, space } from '@reps/ui';
import { Link, Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../providers/app-provider';

/**
 * The first-run screen, and only the first run.
 *
 * Anyone who has finished the questionnaire once is sent straight to Today.
 * That decision is made from a locally cached flag rather than the path list,
 * because reading the list means a request: the learner would get a spinner on
 * every cold start, or worse, a flash of this screen before the redirect. The
 * flag is corrected against the real list by the Today screen, so a device
 * whose paths were deleted server-side comes back here on the next launch.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, onboarded, ready } = useApp();

  // Nothing is decided until storage has been read - rendering the welcome
  // copy first and redirecting after would be the flash this avoids.
  if (!ready) return null;

  if (onboarded) return <Redirect href="/(tabs)" />;

  // A draft only counts as resumable once the first answer exists.
  const hasDraft = Boolean(draft.skill);
  const resumeStep = firstIncompleteStep(draft);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.hero}>
        <PipLogo size={128} />
        <Text variant="display" center style={styles.title}>
          Get good at one thing at a time.
        </Text>
        <Text variant="body" tone="textSecondary" center>
        Tell Reps what you want to be able to do. It builds five to eight techniques and tracks practice until you can do the thing.
        </Text>
      </View>

      <View style={styles.actions}>
        {hasDraft ? (
          <>
            <Button
              label={`Continue with ${draft.skill}`}
              onPress={() => router.push(`/onboarding/${resumeStep}`)}
              testID="resume"
            />
            {/*
              Navigates without clearing. The skill screen already drops the
              goal and level when the skill actually changes, so there is no
              destructive action sitting under the primary button.
            */}
            <Button
              label="Pick a different skill"
              variant="ghost"
              onPress={() => router.push('/onboarding/skill')}
            />
          </>
        ) : (
          <Button
            label="Get started"
            onPress={() => router.push('/onboarding/skill')}
            testID="get-started"
          />
        )}

        {__DEV__ ? (
          <Link href="/gallery" style={styles.devLink}>
            <Text variant="caption" tone="textSecondary">
              Design system (dev)
            </Text>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.surfacePage,
    paddingHorizontal: space.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.base },
  title: { marginTop: space.sm },
  actions: { gap: space.sm, paddingBottom: space.base },
  devLink: { alignSelf: 'center', paddingVertical: space.sm },
});
