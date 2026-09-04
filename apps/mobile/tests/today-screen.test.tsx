import type { LearningPath, LearningPathSummary, Technique } from '@reps/core';
import { fireEvent } from '@testing-library/react-native';
import TodayScreen from '../src/app/(tabs)/index';
import { renderScreen } from './support/render-screen';

const mockPush = jest.fn();
const mockFocusPath = jest.fn();
const mockReconcileOnboarded = jest.fn();
const mockReload = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({
    focusPath: mockFocusPath,
    reconcileOnboarded: mockReconcileOnboarded,
    api: null,
    ready: true,
  }),
}));

let mockList: {
  paths: LearningPathSummary[];
  focusedId: string | null;
  error: unknown;
  loading: boolean;
};
let mockPathState: { path: LearningPath | null; loading: boolean };

let mockEntries: { at: string; minutes: number; xp: number; pathId: string }[] = [];

jest.mock('../src/features/progress/useStreak', () => {
  const core = jest.requireActual('@reps/core');

  return {
    // The real derivation, over stubbed entries: the streak logic is unit
    // tested elsewhere, and mocking it here would let the screen lie.
    usePracticeHistory: () => ({
      entries: mockEntries,
      streak: core.streakFrom(mockEntries, core.today()),
      error: null,
      loading: false,
      reload: jest.fn(),
    }),
    useWeek: (entries: unknown[], dailyMinutes: number, daysPerWeek: number) =>
      core.weekEndingToday(entries, core.today(), { dailyMinutes, daysPerWeek }),
  };
});

jest.mock('../src/features/paths/usePaths', () => ({
  usePathList: () => ({ ...mockList, reload: mockReload }),
  usePath: () => ({ ...mockPathState, error: null, reload: mockReload }),
}));

function technique(overrides: Partial<Technique> & { id: string }): Technique {
  return {
    pathId: 'path_guitar',
    order: 0,
    title: 'Chord transitions',
    whyItMatters: 'Smooth changes are the difference between knowing chords and playing a song.',
    modality: 'watch_and_do',
    practicePrompt: 'G to C, ten clean reps.',
    estimatedMinutes: 15,
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

function summary(id: string, skill: string, completed = 1): LearningPathSummary {
  return {
    id,
    userId: 'usr_1',
    skill,
    archetype: 'motor',
    goal: `get good at ${skill}`,
    level: 'starting out',
    dailyMinutes: 20,
    daysPerWeek: 5,
    preferredFormats: ['video'],
    language: 'en',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    xp: 0,
    badges: [],
    techniqueCount: 6,
    completedCount: completed,
    ...(id === 'path_guitar' ? {} : {}),
  };
}

const guitarPath: LearningPath = {
  ...summary('path_guitar', 'guitar'),
  techniques: [
    technique({ id: 'tec_1', order: 0, title: 'Open chords', status: 'completed' }),
    technique({ id: 'tec_2', order: 1, title: 'Chord transitions', status: 'active' }),
    technique({ id: 'tec_3', order: 2, title: 'Barre chords' }),
    technique({ id: 'tec_4', order: 3, title: 'Fingerpicking' }),
    technique({ id: 'tec_5', order: 4, title: 'Play a song' }),
  ],
} as LearningPath;

describe('TodayScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFocusPath.mockClear();
    mockList = {
      paths: [summary('path_guitar', 'guitar'), summary('path_chess', 'chess', 0)],
      focusedId: 'path_guitar',
      error: null,
      loading: false,
    };
    mockPathState = { path: guitarPath, loading: false };
    mockEntries = [];
  });

  it('leads with the next rep and one button to start it', async () => {
    const { getByText, getByTestId } = await renderScreen(<TodayScreen />);

    expect(getByText('Chord transitions')).toBeOnTheScreen();
    expect(getByTestId('start-rep')).toBeOnTheScreen();
  });

  it('starts the rep in its own session rather than the technique page', async () => {
    const { getByTestId } = await renderScreen(<TodayScreen />);

    await fireEvent.press(getByTestId('start-rep'));

    expect(mockPush).toHaveBeenCalledWith('/practice/tec_2');
  });

  it('offers the detail page without making it the primary action', async () => {
    const { getByText } = await renderScreen(<TodayScreen />);

    await fireEvent.press(getByText('See the details first'));

    expect(mockPush).toHaveBeenCalledWith('/technique/tec_2');
  });

  it('frames the session with the goal and real progress', async () => {
    const { getByText } = await renderScreen(<TodayScreen />);

    expect(getByText('get good at guitar')).toBeOnTheScreen();
    // The count sits beside the bar and must not be pushed away by a long skill.
    expect(getByText('1 of 6')).toBeOnTheScreen();
  });

  /** Why this rep, phrased against the learner's own goal. */
  it('says what the rep is for', async () => {
    const { getByText } = await renderScreen(<TodayScreen />);

    expect(
      getByText('Smooth changes are the difference between knowing chords and playing a song.'),
    ).toBeOnTheScreen();
  });

  /**
   * The session plan replaced the mascot in the hero. It answers the question
   * somebody opening the app actually has: what am I about to spend 15 minutes
   * doing?
   */
  it('breaks the session into minutes per format', async () => {
    const { getByText } = await renderScreen(<TodayScreen />);

    expect(getByText('1m Reflect')).toBeOnTheScreen();
  });

  it('keeps a sentence-length skill name on screen with its count', async () => {
    const long = 'I Want To Learn Concurrency In Golang';
    mockList = {
      paths: [summary('path_go', long)],
      focusedId: 'path_go',
      error: null,
      loading: false,
    };

    const { getByText } = await renderScreen(<TodayScreen />);

    expect(getByText(long)).toBeOnTheScreen();
    expect(getByText('1 of 6')).toBeOnTheScreen();
  });

  /** Two hobbies are peers: both are pages, neither is buried in a menu. */
  it('gives every path a page and offers one more for a new hobby', async () => {
    const { getByText, getByTestId } = await renderScreen(<TodayScreen />);

    expect(getByText('guitar')).toBeOnTheScreen();
    expect(getByText('chess')).toBeOnTheScreen();
    expect(getByTestId('add-path')).toBeOnTheScreen();
  });

  it('starts another hobby from the last page', async () => {
    const { getByTestId } = await renderScreen(<TodayScreen />);

    await fireEvent.press(getByTestId('add-path'));

    expect(mockPush).toHaveBeenCalledWith('/onboarding/skill');
  });

  /** Starting a rep on a path you only swiped past would be an accident. */
  it('shows no start button on an unfocused path', async () => {
    const { getAllByText } = await renderScreen(<TodayScreen />);

    expect(getAllByText('Start the rep')).toHaveLength(1);
    expect(getAllByText('Swipe to this hobby to pick it up.')).toHaveLength(1);
  });

  it('names the next gate as what it unlocks', async () => {
    const { getAllByText } = await renderScreen(<TodayScreen />);

    // Two of six done means two more techniques clear gate 1.
    expect(getAllByText('2 more techniques clears gate 1 of 2').length).toBeGreaterThan(0);
  });

  describe('the streak', () => {
    it('shows a real zero rather than softening it', async () => {
      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('No streak yet. One session starts it.')).toBeOnTheScreen();
    });

    it('counts today once it has been practised', async () => {
      mockEntries = [{ at: new Date().toISOString(), minutes: 20, xp: 50, pathId: 'path_guitar' }];

      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('1 day streak — today is in.')).toBeOnTheScreen();
    });

    /** A day not yet practised must not read as a broken streak at 9am. */
    it('holds yesterday\'s streak before today is practised', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mockEntries = [{ at: yesterday.toISOString(), minutes: 20, xp: 50, pathId: 'path_guitar' }];

      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('1 day streak. Practise today to keep it.')).toBeOnTheScreen();
    });
  });

  describe('with no paths', () => {
    beforeEach(() => {
      mockList = { paths: [], focusedId: null, error: null, loading: false };
      mockPathState = { path: null, loading: false };
    });

    it('explains what to do instead of showing an empty shell', async () => {
      const { getByText, getByTestId } = await renderScreen(<TodayScreen />);

      expect(getByText('Nothing on today')).toBeOnTheScreen();
      expect(getByTestId('start-hobby')).toBeOnTheScreen();
    });

    it('shows no pager when there is nothing to page through', async () => {
      const { queryByTestId } = await renderScreen(<TodayScreen />);

      expect(queryByTestId('add-path')).toBeNull();
    });
  });

  describe('when the path is finished', () => {
    beforeEach(() => {
      mockPathState = {
        path: {
          ...guitarPath,
          techniques: guitarPath.techniques.map((item) => ({
            ...item,
            status: 'completed' as const,
          })),
        },
        loading: false,
      };
    });

    it('says so rather than leaving the page empty', async () => {
      mockList = {
        paths: [summary('path_guitar', 'guitar', 6)],
        focusedId: 'path_guitar',
        error: null,
        loading: false,
      };

      const { getByText, queryByTestId } = await renderScreen(<TodayScreen />);

      expect(getByText('Path complete')).toBeOnTheScreen();
      expect(queryByTestId('start-rep')).toBeNull();
    });
  });

  describe('when the API is unreachable', () => {
    beforeEach(() => {
      mockList = {
        paths: [],
        focusedId: null,
        error: { code: 'NetworkError', message: 'offline' },
        loading: false,
      };
      mockPathState = { path: null, loading: false };
    });

    it('offers a retry rather than an empty screen', async () => {
      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('Can’t reach Reps')).toBeOnTheScreen();
      await fireEvent.press(getByText('Try again'));
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
