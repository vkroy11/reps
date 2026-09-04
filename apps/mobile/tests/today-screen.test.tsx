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
  });

  it('shows the active technique as the one decision on the screen', async () => {
    const { getByText, getByTestId } = await renderScreen(<TodayScreen />);

    expect(getByText('Chord transitions')).toBeOnTheScreen();
    expect(getByTestId('start-practice')).toBeOnTheScreen();
  });

  it('frames the session with the goal and real progress', async () => {
    const { getByText } = await renderScreen(<TodayScreen />);

    expect(getByText('get good at guitar')).toBeOnTheScreen();
    // The count sits beside the bar and must not be pushed away by a long skill.
    expect(getByText('1/6')).toBeOnTheScreen();
  });

  /**
   * Today is the session, not a second copy of the path: it carries the rep,
   * which the Path tab does not show.
   */
  it('leads with the rep to perform', async () => {
    const { getByText } = await renderScreen(<TodayScreen />);

    expect(getByText('The rep')).toBeOnTheScreen();
    expect(getByText('G to C, ten clean reps.')).toBeOnTheScreen();
  });

  /**
   * Only the immediate next technique is named. Listing the whole tail here
   * duplicated the Path tab, which is what made this screen feel repetitive.
   */
  it('names just the next technique, not the whole tail', async () => {
    const { getByText, queryAllByText } = await renderScreen(<TodayScreen />);

    expect(getByText('After this: Barre chords')).toBeOnTheScreen();
    expect(queryAllByText('Fingerpicking')).toHaveLength(0);
    expect(queryAllByText('Open chords')).toHaveLength(0);
  });

  /**
   * The skill sits above the progress bar with room to wrap: it can be a whole
   * sentence like "I want to learn concurrency in Golang".
   */
  it('shows the focused skill above the progress bar', async () => {
    const { getByText, getByTestId } = await renderScreen(<TodayScreen />);

    expect(getByText('guitar')).toBeOnTheScreen();
    expect(getByTestId('open-switcher')).toBeOnTheScreen();
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
    expect(getByText('1/6')).toBeOnTheScreen();
  });

  it('switches focus to another skill', async () => {
    const { getByTestId } = await renderScreen(<TodayScreen />);

    await fireEvent.press(getByTestId('open-switcher'));
    await fireEvent.press(getByTestId('switch-path_chess'));

    expect(mockFocusPath).toHaveBeenCalledWith('path_chess');
  });

  it('offers starting a new skill from the switcher', async () => {
    const { getByTestId } = await renderScreen(<TodayScreen />);

    await fireEvent.press(getByTestId('open-switcher'));
    await fireEvent.press(getByTestId('start-new'));

    expect(mockPush).toHaveBeenCalledWith('/onboarding/skill');
  });

  describe('with no paths', () => {
    beforeEach(() => {
      mockList = { paths: [], focusedId: null, error: null, loading: false };
      mockPathState = { path: null, loading: false };
    });

    it('explains what to do instead of showing an empty shell', async () => {
      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('Nothing here yet')).toBeOnTheScreen();
      expect(getByText('Get started')).toBeOnTheScreen();
    });

    it('hides the skill switcher when there is nothing to switch', async () => {
      const { queryByTestId } = await renderScreen(<TodayScreen />);

      expect(queryByTestId('open-switcher')).toBeNull();
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

    it('says so rather than leaving the focus card empty', async () => {
      const { getByText, queryByTestId } = await renderScreen(<TodayScreen />);

      expect(getByText('Path complete')).toBeOnTheScreen();
      expect(queryByTestId('start-practice')).toBeNull();
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
