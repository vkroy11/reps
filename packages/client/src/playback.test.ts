import { describe, expect, it } from 'vitest';
import { createPlaybackStore, formatTimestamp, youtubeVideoId } from './playback';
import { createMemoryStorage } from './storage';

describe('youtubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=mAgc7hr44WM', 'mAgc7hr44WM'],
    ['https://www.youtube.com/watch?v=mAgc7hr44WM&t=42s', 'mAgc7hr44WM'],
    ['https://youtu.be/mAgc7hr44WM', 'mAgc7hr44WM'],
    ['https://www.youtube.com/embed/mAgc7hr44WM', 'mAgc7hr44WM'],
    ['https://www.youtube.com/shorts/mAgc7hr44WM', 'mAgc7hr44WM'],
  ])('extracts the id from %s', (url, expected) => {
    expect(youtubeVideoId(url)).toBe(expected);
  });

  it('returns null for anything it cannot read', () => {
    expect(youtubeVideoId(null)).toBeNull();
    expect(youtubeVideoId('https://example.test/watch?v=short')).toBeNull();
    expect(youtubeVideoId('not a url')).toBeNull();
  });
});

describe('formatTimestamp', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [222, '3:42'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('formats %i as %s', (seconds, expected) => {
    expect(formatTimestamp(seconds)).toBe(expected);
  });

  it('never renders a negative time', () => {
    expect(formatTimestamp(-5)).toBe('0:00');
  });
});

describe('playback store', () => {
  it('remembers where the learner got to', async () => {
    const store = createPlaybackStore(createMemoryStorage());

    await store.save('res_1', 128.7);

    expect(await store.resumePosition('res_1')).toBe(128);
  });

  it('keeps positions per resource', async () => {
    const store = createPlaybackStore(createMemoryStorage());

    await store.save('res_1', 100);
    await store.save('res_2', 200);

    expect(await store.resumePosition('res_1')).toBe(100);
    expect(await store.resumePosition('res_2')).toBe(200);
  });

  /** Resuming a few seconds in is more annoying than starting over. */
  it('does not resume from the first few seconds', async () => {
    const store = createPlaybackStore(createMemoryStorage());

    await store.save('res_1', 8);

    expect(await store.resumePosition('res_1')).toBeNull();
  });

  it('starts again when the video was effectively finished', async () => {
    const store = createPlaybackStore(createMemoryStorage());

    await store.save('res_1', 415);

    expect(await store.resumePosition('res_1', 420)).toBeNull();
    expect(await store.resumePosition('res_1', 900)).toBe(415);
  });

  it('has nothing to resume for an unseen resource', async () => {
    const store = createPlaybackStore(createMemoryStorage());

    expect(await store.resumePosition('never-watched')).toBeNull();
  });

  it('forgets a position on request', async () => {
    const store = createPlaybackStore(createMemoryStorage());

    await store.save('res_1', 100);
    await store.clear('res_1');

    expect(await store.resumePosition('res_1')).toBeNull();
  });

  it('survives corrupt stored data', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('reps.playback-positions', 'not json');
    const store = createPlaybackStore(storage);

    expect(await store.resumePosition('res_1')).toBeNull();
    await store.save('res_1', 60);
    expect(await store.resumePosition('res_1')).toBe(60);
  });
});
