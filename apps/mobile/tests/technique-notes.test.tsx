import type { Note, Resource, Technique } from '@reps/core';
import { act, fireEvent } from '@testing-library/react-native';
// Type-only, so it survives the jest.mock below (type imports are erased).
import type { ProgressData } from 'react-native-youtube-bridge';
import TechniqueScreen from '../src/app/technique/[id]';
import { renderScreen } from './support/render-screen';

let mockParams: { id: string; seek?: string } = { id: 'tec_2' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const mockPush = jest.fn();

// The adaptation sheet reaches for the API client through the provider.
jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({ api: null, ready: true }),
}));

const mockSeekTo = jest.fn();

/**
 * The real bridge renders a WebView and talks to YouTube. What this screen
 * actually depends on is narrower: progress events and seekTo. So the fake
 * exposes exactly those, and `mockEmitProgress` lets a test put the player at a
 * known position. The `mock` prefixes are what let the hoisted jest.mock
 * factory close over them.
 */
let mockEmitProgress: ((data: ProgressData) => void) | null = null;

jest.mock('react-native-youtube-bridge', () => ({
  YoutubeView: 'YoutubeView',
  useYouTubePlayer: () => ({ seekTo: mockSeekTo }),
  useYouTubeEvent: (
    _player: unknown,
    event: string,
    handler: (data: ProgressData) => void,
  ) => {
    if (event === 'progress') mockEmitProgress = handler;
  },
}));

const mockAdd = jest.fn();
const mockEdit = jest.fn();
let mockNotes: Note[];

jest.mock('../src/features/notes/useNotes', () => ({
  useTechniqueNotes: () => ({
    notes: mockNotes,
    error: null,
    loading: false,
    add: mockAdd,
    edit: mockEdit,
    remove: jest.fn(),
  }),
}));

let mockTechnique: Technique | null;

jest.mock('../src/features/techniques/useTechnique', () => ({
  useTechnique: () => ({
    technique: mockTechnique,
    error: null,
    loading: false,
    reload: jest.fn(),
  }),
  useTechniqueContent: () => ({
    content: null,
    loading: false,
    error: null,
    load: jest.fn(),
  }),
}));

const resource: Resource = {
  id: 'res_1',
  techniqueId: 'tec_2',
  format: 'video',
  title: 'Smooth chord changes in 10 minutes',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  thumbnailUrl: null,
  source: 'JustinGuitar',
  durationSec: 620,
  selectionReason: 'Shows the transition slowly before speeding it up.',
};

function baseTechnique(resources: Resource[]): Technique {
  return {
    id: 'tec_2',
    pathId: 'path_guitar',
    order: 1,
    title: 'Chord transitions',
    whyItMatters: 'Songs live in the changes, not the shapes.',
    modality: 'watch_and_do',
    practicePrompt: 'One minute per change, metronome at 60.',
    estimatedMinutes: 12,
    status: 'active',
    confidence: null,
    struggleCount: 0,
    practiceMinutes: 0,
    bridgeForTechniqueId: null,
    searchQueries: [],
    resources,
  };
}

function note(overrides: Partial<Note> & { id: string }): Note {
  return {
    userId: 'usr_1',
    techniqueId: 'tec_2',
    resourceId: 'res_1',
    timestampSec: 222,
    body: 'Thumb behind the neck.',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

/** Puts the player at a position, the way a real progress tick would. */
async function playTo(currentTime: number, duration = 620) {
  await act(async () => {
    mockEmitProgress?.({
      currentTime,
      duration,
      percentage: (currentTime / duration) * 100,
      loadedFraction: 1,
    });
  });
}

describe('TechniqueScreen notes', () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockEdit.mockClear();
    mockSeekTo.mockClear();
    mockPush.mockClear();
    mockEmitProgress = null;
    mockParams = { id: 'tec_2' };
    mockNotes = [];
    mockTechnique = baseTechnique([resource]);
  });

  it('anchors a new note to where the video has got to', async () => {
    const { getByTestId } = await renderScreen(<TechniqueScreen />);

    await playTo(222.6);
    await fireEvent.press(getByTestId('add-timestamped-note'));
    await fireEvent.changeText(getByTestId('note-input'), '  Thumb behind the neck.  ');
    await fireEvent.press(getByTestId('save-note'));

    expect(mockAdd).toHaveBeenCalledWith({
      body: 'Thumb behind the neck.',
      resourceId: 'res_1',
      timestampSec: 222,
    });
  });

  it('shows the captured moment in the composer before you commit to it', async () => {
    const { getByTestId, getByText } = await renderScreen(<TechniqueScreen />);

    await playTo(65);
    await fireEvent.press(getByTestId('add-timestamped-note'));

    expect(getByText('at 1:05')).toBeOnTheScreen();
  });

  it('will not save an empty note', async () => {
    const { getByTestId } = await renderScreen(<TechniqueScreen />);

    await playTo(30);
    await fireEvent.press(getByTestId('add-timestamped-note'));
    await fireEvent.changeText(getByTestId('note-input'), '   ');
    await fireEvent.press(getByTestId('save-note'));

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('jumps the player to a note’s moment when the note is tapped', async () => {
    mockNotes = [note({ id: 'not_1', timestampSec: 222 })];
    const { getByTestId } = await renderScreen(<TechniqueScreen />);

    await fireEvent.press(getByTestId('note-not_1'));

    expect(mockSeekTo).toHaveBeenCalledWith(222);
  });

  it('edits a note in place rather than adding a second one', async () => {
    mockNotes = [note({ id: 'not_1' })];
    const { getByTestId } = await renderScreen(<TechniqueScreen />);

    await fireEvent(getByTestId('note-not_1'), 'longPress');
    await fireEvent.changeText(getByTestId('note-input'), 'Thumb behind the neck, always.');
    await fireEvent.press(getByTestId('save-note'));

    expect(mockEdit).toHaveBeenCalledWith('not_1', 'Thumb behind the neck, always.');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  /**
   * The notebook's "Jump to 3:42 in the video" is a promise. A label naming an
   * anchor the destination ignores teaches learners to distrust every label,
   * so arriving with ?seek= has to actually seek.
   */
  describe('arriving from a note in the notebook', () => {
    it('seeks the player to the moment the label promised', async () => {
      mockParams = { id: 'tec_2', seek: '222' };

      await renderScreen(<TechniqueScreen />);

      expect(mockSeekTo).toHaveBeenCalledWith(222);
    });

    it('says it jumped, so the seek is not mistaken for a bug', async () => {
      mockParams = { id: 'tec_2', seek: '222' };

      const { getByText } = await renderScreen(<TechniqueScreen />);

      expect(getByText('Jumped to your note · 3:42')).toBeOnTheScreen();
    });

    it('ignores a seek that is not a number', async () => {
      mockParams = { id: 'tec_2', seek: 'banana' };

      const { queryByText } = await renderScreen(<TechniqueScreen />);

      expect(mockSeekTo).not.toHaveBeenCalled();
      expect(queryByText(/Jumped to your note/)).toBeNull();
    });
  });

  describe('changing the path when a technique is not working', () => {
    it('says an easier step goes in front rather than removing this one', async () => {
      const { getByTestId, getByText } = await renderScreen(<TechniqueScreen />);

      await fireEvent.press(getByTestId('too-hard'));

      expect(getByText(/This technique stays/)).toBeOnTheScreen();
    });

    it('promises completed work is safe before removing anything', async () => {
      const { getByTestId, getByText } = await renderScreen(<TechniqueScreen />);

      await fireEvent.press(getByTestId('not-for-me'));

      expect(getByText(/already mastered stays exactly as it is/)).toBeOnTheScreen();
    });
  });

  it('starts the rep as its own session', async () => {
    const { getByTestId } = await renderScreen(<TechniqueScreen />);

    await fireEvent.press(getByTestId('start-rep'));

    expect(mockPush).toHaveBeenCalledWith('/practice/tec_2');
  });

  describe('a technique with no video', () => {
    beforeEach(() => {
      mockTechnique = baseTechnique([]);
    });

    /** A note with no video has no moment; storing 0:00 would be a lie. */
    it('takes an untimed note', async () => {
      const { getByTestId } = await renderScreen(<TechniqueScreen />);

      await fireEvent.press(getByTestId('add-note'));
      await fireEvent.changeText(getByTestId('note-input'), 'Metronome helps more than I expected.');
      await fireEvent.press(getByTestId('save-note'));

      expect(mockAdd).toHaveBeenCalledWith({
        body: 'Metronome helps more than I expected.',
        resourceId: null,
        timestampSec: null,
      });
    });

    it('says why there is no video instead of showing an empty player', async () => {
      const { getByText } = await renderScreen(<TechniqueScreen />);

      expect(getByText(/No video for this one/)).toBeOnTheScreen();
    });
  });
});
