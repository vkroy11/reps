import { createPlaybackStore, formatTimestamp, youtubeVideoId } from '@reps/client';
import type { Resource } from '@reps/core';
import { Text, color, radius, space } from '@reps/ui';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  YoutubeView,
  useYouTubeEvent,
  useYouTubePlayer,
  type ProgressData,
} from 'react-native-youtube-bridge';
import { storage } from '../../lib/storage';

export interface VideoPlayerProps {
  resource: Resource;
  /** Called with the live position when a note is being written. */
  onRegisterPositionReader?: (read: () => number) => void;
  /** Hands the screen a way to jump the player to a note's timestamp. */
  onRegisterSeek?: (seek: (seconds: number) => void) => void;
}

/** Writing on every progress tick would hammer storage for no benefit. */
const SAVE_EVERY_SECONDS = 5;

/**
 * The in-app player.
 *
 * Two rules keep it smooth, both from the motion plan:
 *
 *   1. It is memoised on the resource id, so the surrounding screen can
 *      re-render - adding a note, loading the drill - without remounting the
 *      player and losing playback.
 *   2. Playback position lives in a ref, not in state. Progress is throttled to
 *      one event a second by the bridge, so holding it in state would re-render
 *      this subtree every second for a number nothing on screen displays.
 *
 * That throttle also means a note's timestamp can be up to a second behind the
 * frame you were on. Left as is deliberately: landing slightly early gives you
 * the run-up to the moment, which is what you want when you jump back.
 *
 * Resume is our own feature: YouTube's API does not expose watch position to
 * third parties, so the position is recorded locally per resource.
 */
export const VideoPlayer = memo(
  function VideoPlayer({
    resource,
    onRegisterPositionReader,
    onRegisterSeek,
  }: VideoPlayerProps) {
    const videoId = youtubeVideoId(resource.url);
    const playbackStore = useMemo(() => createPlaybackStore(storage), []);

    const positionRef = useRef(0);
    const lastSavedRef = useRef(0);
    const resumedRef = useRef(false);
    const [resumeFrom, setResumeFrom] = useState<number | null>(null);

    const player = useYouTubePlayer(videoId ?? '', {
      controls: true,
      playsinline: true,
      rel: false,
    });

    // Hand the screen a way to read the position without subscribing to it.
    useEffect(() => {
      onRegisterPositionReader?.(() => positionRef.current);
    }, [onRegisterPositionReader]);

    // ...and a way to jump to a note's moment, which is what makes a
    // timestamped note worth storing.
    useEffect(() => {
      onRegisterSeek?.((seconds) => {
        // A deliberate jump beats a pending resume, so retire the resume.
        resumedRef.current = true;
        positionRef.current = seconds;
        setResumeFrom(null);
        player.seekTo(seconds);
      });
    }, [onRegisterSeek, player]);

    useEffect(() => {
      let active = true;

      void playbackStore
        .resumePosition(resource.id, resource.durationSec ?? undefined)
        .then((position) => {
          if (active && position !== null) setResumeFrom(position);
        });

      return () => {
        active = false;
      };
    }, [playbackStore, resource.id, resource.durationSec]);

    const onProgress = useCallback(
      (progress: ProgressData) => {
        positionRef.current = progress.currentTime;

        // Seek to the stored position once, after playback actually starts.
        if (!resumedRef.current && resumeFrom !== null && progress.currentTime > 0) {
          resumedRef.current = true;
          player.seekTo(resumeFrom);

          return;
        }

        if (Math.abs(progress.currentTime - lastSavedRef.current) >= SAVE_EVERY_SECONDS) {
          lastSavedRef.current = progress.currentTime;
          void playbackStore.save(resource.id, progress.currentTime);
        }
      },
      [player, playbackStore, resource.id, resumeFrom],
    );

    useYouTubeEvent(player, 'progress', onProgress);

    if (!videoId) {
      return (
        <View style={styles.unavailable}>
          <Text variant="caption" tone="textSecondary" center>
            This resource isn’t a playable video.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.frame}>
        <YoutubeView player={player} height="100%" width="100%" />
        {resumeFrom !== null ? (
          <View style={styles.resume}>
            <Text variant="caption" tone="textOnBrand">
              Resuming from {formatTimestamp(resumeFrom)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  },
  // Only a different video justifies tearing the player down.
  (previous, next) => previous.resource.id === next.resource.id,
);

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 16 / 9,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
  },
  resume: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  unavailable: {
    aspectRatio: 16 / 9,
    borderRadius: radius.card,
    backgroundColor: color.surfaceLocked,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.base,
  },
});
