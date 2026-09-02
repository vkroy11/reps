import { firstIncompleteStep } from '@reps/client';
import { usePathList } from '../features/paths/usePaths';
import { Button, PipLogo, Text, color, space } from '@reps/ui';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../providers/app-provider';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, ready } = useApp();
  const { paths, loading: pathsLoading } = usePathList();

  // A draft only counts as resumable once the first answer exists.
  const hasDraft = ready && Boolean(draft.skill);
  const resumeStep = firstIncompleteStep(draft);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.hero}>
        <PipLogo size={128} />
        <Text variant="display" center style={styles.title}>
          Get good at one thing at a time.
        </Text>
        <Text variant="body" tone="textSecondary" center>
          Reps builds a short path of 5–8 techniques, finds the right thing to watch, and stops
          there.
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Someone with paths already is here by accident; send them to Today. */}
        {!pathsLoading && paths.length > 0 ? (
          <Button
            label="Continue learning"
            onPress={() => router.replace('/(tabs)')}
            testID="continue-learning"
          />
        ) : null}

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
