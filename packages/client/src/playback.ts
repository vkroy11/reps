import { z } from 'zod';
import { createJsonStore, type Storage } from './storage';

/**
 * Pulls the video id out of a YouTube URL.
 *
 * The API only ever stores watch URLs it received from the Data API, but this
 * accepts the other shapes too so a hand-entered link does not break the
 * player.
 */
export function youtubeVideoId(url: string | null): string | null {
  if (!url) return null;

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/ID
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) return match[1];
  }

  return null;
}

/** mm:ss, or h:mm:ss past an hour. Used for note timestamps and player time. */
export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const padded = `${minutes.toString().padStart(hours > 0 ? 2 : 1, '0')}:${rest
    .toString()
    .padStart(2, '0')}`;

  return hours > 0 ? `${hours}:${padded}` : padded;
}

const PositionsSchema = z.record(z.string(), z.number().nonnegative());
const KEY = 'reps.playback-positions';

/** Below this, resuming is more annoying than starting over. */
const MIN_RESUME_SECONDS = 15;
/** Within this of the end, the video is finished, so start again. */
const END_TOLERANCE_SECONDS = 20;

/**
 * Where the learner got to in each resource.
 *
 * Local only, deliberately: YouTube's API does not expose watch position to
 * third parties, so this is our own record. It lives behind the Storage port so
 * it can sync through the API later without callers changing.
 */
export function createPlaybackStore(storage: Storage) {
  const json = createJsonStore(storage);

  async function readAll(): Promise<Record<string, number>> {
    const stored = await json.read(KEY, (value) => {
      const parsed = PositionsSchema.safeParse(value);

      return parsed.success ? parsed.data : null;
    });

    return stored ?? {};
  }

  return {
    /** Null when there is nothing worth resuming from. */
    async resumePosition(resourceId: string, durationSec?: number): Promise<number | null> {
      const positions = await readAll();
      const position = positions[resourceId];

      if (position === undefined || position < MIN_RESUME_SECONDS) return null;
      if (durationSec && position > durationSec - END_TOLERANCE_SECONDS) return null;

      return position;
    },

    async save(resourceId: string, positionSec: number): Promise<void> {
      const positions = await readAll();
      await json.write(KEY, { ...positions, [resourceId]: Math.floor(positionSec) });
    },

    async clear(resourceId: string): Promise<void> {
      const positions = await readAll();
      delete positions[resourceId];
      await json.write(KEY, positions);
    },
  };
}

export type PlaybackStore = ReturnType<typeof createPlaybackStore>;
