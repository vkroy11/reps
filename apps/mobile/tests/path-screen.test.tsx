import type { LearningPath, LearningPathSummary, Technique } from '@reps/core';
import { fireEvent } from '@testing-library/react-native';
import PathScreen from '../src/app/(tabs)/path';
import { renderScreen } from './support/render-screen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({ api: null, ready: true, focusPath: jest.fn() }),
}));

let mockPathState: { path: LearningPath | null; loading: boolean };

jest.mock('../src/features/paths/usePaths', () => ({
  usePathList: () => ({
    paths: [mockSummary],
    focusedId: 'path_guitar',
    error: null,
    loading: false,
    reload: jest.fn(),
  }),
  usePath: () => ({ ...mockPathState, error: null, reload: jest.fn() }),
}));

const mockSummary: LearningPathSummary = {
  id: 'path_guitar',
  userId: 'usr_1',
  skill: 'guitar',
  archetype: 'motor',
  goal: 'play 5 songs at a campfire',
  level: 'a few chords',
  dailyMinutes: 20,
  daysPerWeek: 5,
  preferredFormats: ['video'],
  language: 'en',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
  xp: 0,
  badges: [],
  techniqueCount: 4,
  completedCount: 1,
};

function technique(overrides: Partial<Technique> & { id: string }): Technique {
  return {
    pathId: 'path_guitar',
    order: 0,
    title: 'Open chords',
    whyItMatters: 'You need the shapes before you can change between them.',
    modality: 'watch_and_do',
    practicePrompt: 'Form C, G and D, one minute each.',
    estimatedMinutes: 12,
    status: 'locked',
    confidence: null,
    struggleCount: 0,
    practiceMinutes: 0,
    bridgeForTechniqueId: null,
    searchQueries: [],
    resources: [],
    ...overrides,
  };
}

const path = {
  ...mockSummary,
  techniques: [
    technique({ id: 'tec_1', order: 0, title: 'Open chords', status: 'completed' }),
    technique({ id: 'tec_2', order: 1, title: 'Chord transitions', status: 'active' }),
    technique({ id: 'tec_3', order: 2, title: 'Barre chords', status: 'locked' }),
    technique({ id: 'tec_4', order: 3, title: 'Fingerpicking', status: 'skipped' }),
  ],
} as LearningPath;

describe('PathScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathState = { path, loading: false };
  });

  it('draws a disc for every technique', async () => {
    const { getByTestId } = await renderScreen(<PathScreen />);

    for (const id of ['tec_1', 'tec_2', 'tec_3', 'tec_4']) {
      expect(getByTestId(`node-${id}`)).toBeOnTheScreen();
    }
  });

  it('labels every technique beside its disc', async () => {
    const { getByText, getAllByText } = await renderScreen(<PathScreen />);

    expect(getByText('Open chords')).toBeOnTheScreen();
    expect(getByText('Chord transitions')).toBeOnTheScreen();
    expect(getByText('Fingerpicking')).toBeOnTheScreen();
    // Twice: the disc label, and the gate this technique capstones.
    expect(getAllByText('Barre chords')).toHaveLength(2);
  });

  it('numbers the discs as levels', async () => {
    const { getByText } = await renderScreen(<PathScreen />);

    expect(getByText('1')).toBeOnTheScreen();
    expect(getByText('4')).toBeOnTheScreen();
  });

  describe('gates', () => {
    it('states what is left rather than just showing a lock', async () => {
      const { getByText } = await renderScreen(<PathScreen />);

      // One of four is done, and the gate sits after the third.
      expect(getByText('2 techniques to go')).toBeOnTheScreen();
    });

    it('says cleared once its three techniques are done', async () => {
      mockPathState = {
        path: {
          ...path,
          techniques: path.techniques.map((item, index) =>
            index < 3 ? { ...item, status: 'completed' as const } : item,
          ),
        },
        loading: false,
      };

      const { getByText } = await renderScreen(<PathScreen />);

      expect(getByText('Gate cleared')).toBeOnTheScreen();
    });

    /** Singular, because "1 techniques to go" is the tell of a templated string. */
    it('counts one remaining technique in the singular', async () => {
      mockPathState = {
        path: {
          ...path,
          techniques: path.techniques.map((item, index) =>
            index < 2 ? { ...item, status: 'completed' as const } : item,
          ),
        },
        loading: false,
      };

      const { getByText } = await renderScreen(<PathScreen />);

      expect(getByText('1 technique to go')).toBeOnTheScreen();
    });
  });

  it('holds the goal at the finish marker, so the map has an end', async () => {
    const { getAllByText } = await renderScreen(<PathScreen />);

    // Once in the subhead, once at the finish.
    expect(getAllByText('play 5 songs at a campfire')).toHaveLength(2);
  });

  /** Counted from stored badges and sessions, never estimated. */
  it('reports XP and gates cleared from real totals', async () => {
    const { getByText } = await renderScreen(<PathScreen />);

    expect(getByText('0 XP · 0 of 2 gates cleared')).toBeOnTheScreen();
  });

  it('marks where the learner is', async () => {
    const { getByText } = await renderScreen(<PathScreen />);

    expect(getByText('You are here')).toBeOnTheScreen();
  });

  it('marks finished techniques as mastered', async () => {
    const { getByText } = await renderScreen(<PathScreen />);

    expect(getByText('Mastered')).toBeOnTheScreen();
  });

  it('shows a removed technique as removed rather than hiding it', async () => {
    const { getByText } = await renderScreen(<PathScreen />);

    expect(getByText('Not for me')).toBeOnTheScreen();
  });

  it('keeps the count beside a long skill name', async () => {
    const { getByText } = await renderScreen(<PathScreen />);

    expect(getByText('1 of 4')).toBeOnTheScreen();
  });

  describe('tapping a node', () => {
    it('opens the start sheet with why it matters', async () => {
      const { getByTestId, getByText } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_2'));

      expect(getByText('You need the shapes before you can change between them.')).toBeOnTheScreen();
      expect(getByTestId('sheet-start')).toBeOnTheScreen();
    });

    it('starts the technique', async () => {
      const { getByTestId } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_2'));
      await fireEvent.press(getByTestId('sheet-start'));

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_2');
    });

    /** A tap that does nothing reads as a broken app. */
    it('explains what unlocks a locked technique instead of doing nothing', async () => {
      const { getByTestId, getByText, queryByTestId } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_3'));

      expect(getByText(/Opens once you finish Chord transitions/)).toBeOnTheScreen();
      expect(queryByTestId('sheet-start')).toBeNull();
    });

    it('offers a repeat on a finished technique', async () => {
      const { getByTestId, getByText } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_1'));

      expect(getByText('Practise again')).toBeOnTheScreen();
    });

    it('explains a removed technique and offers no start', async () => {
      const { getByTestId, getByText, queryByTestId } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_4'));

      expect(getByText(/You removed this one/)).toBeOnTheScreen();
      expect(queryByTestId('sheet-start')).toBeNull();
    });
  });
});
