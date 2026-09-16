import { Button, Text, color, radius, space } from '@reps/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { VideoPlayer, type VideoPlayerProps } from './VideoPlayer';

/**
 * The in-app player, with a same-sized fallback if the embed throws.
 *
 * A YouTube WebView that dies should not take the technique screen with it —
 * the practice below is still the point of the visit.
 */
export function SafeVideoPlayer(props: VideoPlayerProps) {
  const [generation, setGeneration] = useState(0);

  return (
    <ErrorBoundary
      resetKey={`${props.resource.id}:${generation}`}
      fallback={<PlayerFallback onRetry={() => setGeneration((value) => value + 1)} />}
    >
      <VideoPlayer {...props} />
    </ErrorBoundary>
  );
}

function PlayerFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.fallback} testID="player-fallback">
      <Text variant="caption" tone="textSecondary" center>
        This video couldn’t play. The practice below still works.
      </Text>
      <Button label="Try the video again" variant="secondary" onPress={onRetry} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    aspectRatio: 16 / 9,
    borderRadius: radius.card,
    backgroundColor: color.surfaceLocked,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.base,
  },
});
