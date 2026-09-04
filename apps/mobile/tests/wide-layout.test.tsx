import type { LearningPath, LearningPathSummary, Technique } from '@reps/core';
import { breakpoint } from '@reps/ui';
import { fireEvent } from '@testing-library/react-native';
import PathScreen from '../src/app/(tabs)/path';
import { renderScreen } from './support/render-screen';

let mockWidth = 390;

/**
 * The one input the two-pane layout depends on. Mocked at the module rather
 * than through `useBreakpoint` so the real breakpoint arithmetic still runs -
 * the thing worth testing is what the app does at a width, not that a stub
 * returns a boolean.
 */
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 2, fontScale: 1 }),
}));

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
    paths: [summary],
    focusedId: 'path_guitar',
    error: null,
    loading: false,
    reload: jest.fn(),
  }),
  usePath: () => ({ ...mockPathState, error: null, reload: jest.fn() }),
}));

const summary: LearningPathSummary = {
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
  ...summary,
  techniques: [
    technique({ id: 'tec_1', order: 0, title: 'Open chords', status: 'completed' }),
    technique({ id: 'tec_2', order: 1, title: 'Chord transitions', status: 'active' }),
    technique({ id: 'tec_3', order: 2, title: 'Barre chords', status: 'locked' }),
    technique({ id: 'tec_4', order: 3, title: 'Fingerpicking', status: 'locked' }),
  ],
} as LearningPath;

describe('the wide layout', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathState = { path, loading: false };
  });

  describe('on a phone', () => {
    beforeEach(() => {
      mockWidth = 390;
    });

    it('puts the technique in a sheet over the board', async () => {
      const { getByTestId } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_2'));

      expect(getByTestId('sheet-start')).toBeOnTheScreen();
    });

    it('has no idle pane to explain, because there is no pane', async () => {
      const { queryByText } = await renderScreen(<PathScreen />);

      expect(queryByText(/Pick a level on the board/)).toBeNull();
    });
  });

  describe('at the two-pane breakpoint', () => {
    beforeEach(() => {
      mockWidth = breakpoint.wide;
    });

    /** An empty pane reads as a rendering failure unless it says what fills it. */
    it('says what the second pane is for before anything is selected', async () => {
      const { getByText } = await renderScreen(<PathScreen />);

      expect(getByText(/Pick a level on the board/)).toBeOnTheScreen();
    });

    it('fills the pane instead of covering the board with a sheet', async () => {
      const { getByTestId, queryByText } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_2'));

      expect(getByTestId('sheet-start')).toBeOnTheScreen();
      expect(queryByText(/Pick a level on the board/)).toBeNull();
    });

    /**
     * The board stays visible in the wide layout, so a second tap on the open
     * node should clear the pane. On a phone the same tap has to reopen the
     * sheet, because the sheet is what was dismissed.
     */
    it('toggles the selection off on a second tap', async () => {
      const { getByTestId, getByText } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_2'));
      await fireEvent.press(getByTestId('node-tec_2'));

      expect(getByText(/Pick a level on the board/)).toBeOnTheScreen();
    });

    it('still explains a locked technique rather than doing nothing', async () => {
      const { getByTestId, getByText } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_3'));

      expect(getByText(/Opens once you finish Chord transitions/)).toBeOnTheScreen();
    });

    it('starts a technique from the pane', async () => {
      const { getByTestId } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_2'));
      await fireEvent.press(getByTestId('sheet-start'));

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_2');
    });

    /** The pane is always on screen, so a Close button would do nothing. */
    it('offers no Close in the pane', async () => {
      const { getByTestId, queryByText } = await renderScreen(<PathScreen />);

      await fireEvent.press(getByTestId('node-tec_2'));

      expect(queryByText('Close')).toBeNull();
    });
  });

  /** One pixel below the breakpoint is still a phone. */
  it('does not switch layout a pixel early', async () => {
    mockWidth = breakpoint.wide - 1;

    const { queryByText } = await renderScreen(<PathScreen />);

    expect(queryByText(/Pick a level on the board/)).toBeNull();
  });
});
