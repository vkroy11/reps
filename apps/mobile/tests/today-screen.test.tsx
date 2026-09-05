import type {
  Confidence,
  LearningPath,
  LearningPathSummary,
  NoteWithContext,
  Resource,
  Technique,
} from '@reps/core';
import { toLocalDay } from '@reps/core';
import { fireEvent, within } from '@testing-library/react-native';
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
let mockEntries: {
  at: string;
  minutes: number;
  xp: number;
  pathId: string;
  techniqueId: string;
  confidence: Confidence;
}[] = [];
let mockNotes: NoteWithContext[] = [];
let mockHistoryLoading = false;
let mockPathsById: Record<string, LearningPath> = {};

jest.mock('../src/features/progress/useStreak', () => {
  const core = jest.requireActual('@reps/core');

  return {
    // The real derivation, over stubbed entries: the streak logic is unit
    // tested elsewhere, and mocking it here would let the screen lie.
    usePracticeHistory: () => ({
      entries: mockEntries,
      streak: core.streakFrom(mockEntries, core.today()),
      error: null,
      loading: mockHistoryLoading,
      reload: jest.fn(),
    }),
    useWeek: (entries: unknown[], dailyMinutes: number, daysPerWeek: number) =>
      core.weekEndingToday(entries, core.today(), { dailyMinutes, daysPerWeek }),
  };
});

jest.mock('../src/features/paths/usePaths', () => ({
  usePathList: () => ({ ...mockList, reload: mockReload }),
  usePath: () => ({ ...mockPathState, error: null, reload: mockReload }),
  usePathsFor: () => mockPathsById,
}));

jest.mock('../src/features/notes/useNotes', () => ({
  useNotebook: () => ({ notes: mockNotes, error: null, loading: false, reload: jest.fn() }),
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

function resource(overrides: Partial<Resource> & { id: string }): Resource {
  return {
    techniqueId: 'tec_2',
    format: 'video',
    title: 'Fast chord changes: the pivot trick',
    url: 'https://example.test/watch',
    thumbnailUrl: null,
    source: 'Paul Davids',
    durationSec: 784,
    selectionReason: 'Shortest demonstration of the pivot at your level.',
    ...overrides,
  };
}

function note(overrides: Partial<NoteWithContext> & { id: string }): NoteWithContext {
  return {
    userId: 'usr_1',
    techniqueId: 'tec_2',
    techniqueTitle: 'Chord transitions',
    pathId: 'path_guitar',
    skill: 'guitar',
    resourceId: 'res_1',
    timestampSec: 222,
    body: 'Pivot finger trick actually works. G to C is nearly clean.',
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z',
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
    xp: 40,
    badges: [],
    techniqueCount: 6,
    completedCount: completed,
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

const chessPath: LearningPath = {
  ...summary('path_chess', 'chess', 0),
  techniques: [
    technique({
      id: 'tec_c1',
      pathId: 'path_chess',
      order: 0,
      title: 'Spot the fork',
      status: 'active',
    }),
    technique({ id: 'tec_c2', pathId: 'path_chess', order: 1, title: 'Pin and skewer' }),
  ],
} as LearningPath;

/** A session on the given day, at midday so no test depends on the zone. */
function entryDaysAgo(back: number, confidence: Confidence = 'getting_there') {
  const at = new Date();
  at.setDate(at.getDate() - back);
  at.setHours(12, 0, 0, 0);

  return {
    at: at.toISOString(),
    minutes: 20,
    xp: 40,
    pathId: 'path_guitar',
    techniqueId: 'tec_2',
    confidence,
  };
}

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
    mockPathsById = { path_guitar: guitarPath, path_chess: chessPath };
    mockEntries = [];
    mockNotes = [];
    mockHistoryLoading = false;
  });

  describe('the hero', () => {
    it('leads with the next rep and one button to start it', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);
      const page = within(getByTestId('hero-page-path_guitar'));

      expect(page.getByText('Chord transitions')).toBeOnTheScreen();
      expect(page.getByTestId('start-rep')).toBeOnTheScreen();
    });

    /**
     * The CTA opens the technique, not the timer. Starting a session straight
     * from Today skipped the lesson - which for a recall technique meant being
     * dropped into a deck of answers you had never been taught.
     */
    it('opens the technique rather than starting a timer', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);
      const page = within(getByTestId('hero-page-path_guitar'));

      await fireEvent.press(page.getByTestId('start-rep'));

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_2');
    });

    it('offers the whole board as the secondary action', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);
      const page = within(getByTestId('hero-page-path_guitar'));

      await fireEvent.press(page.getByText('See the details first'));

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/path');
    });

    /** Which hobby, and how far in, in one line above the title. */
    it('places the rep in its path', async () => {
      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('GUITAR · LEVEL 2 OF 6')).toBeOnTheScreen();
    });

    it('keeps a sentence-length skill name on screen', async () => {
      mockList = {
        paths: [summary('path_go', 'I want to learn concurrency in Golang')],
        focusedId: 'path_go',
        error: null,
        loading: false,
      };
      mockPathsById = { path_go: { ...guitarPath, id: 'path_go' } };

      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('I WANT TO LEARN CONCURRENCY IN GOLANG · LEVEL 2 OF 6')).toBeOnTheScreen();
    });

    /** Why this rep, phrased against the learner's own goal. */
    it('says what the rep is for', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);
      const page = within(getByTestId('hero-page-path_guitar'));

      expect(
        page.getByText(
          'Smooth changes are the difference between knowing chords and playing a song.',
        ),
      ).toBeOnTheScreen();
    });

    /**
     * The session plan replaced the mascot in the hero. It answers the question
     * somebody opening the app actually has: what am I about to spend 15
     * minutes doing?
     */
    it('breaks the session into stages with minutes on each', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);
      const page = within(getByTestId('hero-page-path_guitar'));

      expect(page.getByText('Watch')).toBeOnTheScreen();
      expect(page.getByText('Reflect')).toBeOnTheScreen();
      expect(page.getByText('1 min')).toBeOnTheScreen();
    });

    /** Two hobbies are peers: both are pages, neither is buried in a menu. */
    it('gives every path a page and offers one more for a new hobby', async () => {
      const { getByText, getByTestId } = await renderScreen(<TodayScreen />);

      expect(getByText('GUITAR · LEVEL 2 OF 6')).toBeOnTheScreen();
      expect(getByText('CHESS · LEVEL 1 OF 6')).toBeOnTheScreen();
      expect(getByTestId('add-path')).toBeOnTheScreen();
    });

    /**
     * A finished hobby has nothing to do on it, so it sorts behind the page for
     * starting something new: what you are doing, what you could start, then
     * what you have already done.
     */
    it('puts a finished hobby behind the page for starting a new one', async () => {
      const finished = summary('path_chess', 'chess', 6);
      mockList = {
        paths: [mockList.paths[0]!, finished],
        focusedId: 'path_guitar',
        error: null,
        loading: false,
      };
      mockPathsById = {
        path_guitar: guitarPath,
        path_chess: { ...chessPath, ...finished } as LearningPath,
      };

      const { getAllByTestId, getByTestId } = await renderScreen(<TodayScreen />);
      const pages = getAllByTestId(/^hero-page-|^add-path$/);

      expect(pages.map((page) => page.props.testID)).toEqual([
        'hero-page-path_guitar',
        'add-path',
        'hero-page-path_chess',
      ]);
      expect(
        within(getByTestId('hero-page-path_chess')).getByText('Path complete'),
      ).toBeOnTheScreen();
    });

    it('starts another hobby from the last page', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);

      await fireEvent.press(getByTestId('add-path'));

      expect(mockPush).toHaveBeenCalledWith('/onboarding/skill');
    });

    /**
     * Every page is drawn from its own path, which is what removed the flash:
     * a page used to appear with only its summary line and then fill in once
     * focus settled, so swiping showed the wrong hobby's copy for a moment.
     */
    it('gives every hobby its own next rep, not just the focused one', async () => {
      const { getAllByTestId, getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('Chord transitions')).toBeOnTheScreen();
      expect(getByText('Spot the fork')).toBeOnTheScreen();
      expect(getByText('CHESS · LEVEL 1 OF 6')).toBeOnTheScreen();
      // One CTA per real hobby, so a swipe never lands on a page with none.
      expect(getAllByTestId('start-rep')).toHaveLength(2);
    });

    it('opens the technique belonging to the page it was tapped on', async () => {
      const { getAllByTestId } = await renderScreen(<TodayScreen />);

      await fireEvent.press(getAllByTestId('start-rep')[1]!);

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_c1');
    });

    /** A hobby not yet fetched gets a placeholder rather than a wrong page. */
    it('stands in for a hobby that has not arrived yet', async () => {
      mockPathsById = { path_guitar: guitarPath };

      const { getAllByTestId, queryByText } = await renderScreen(<TodayScreen />);

      expect(getAllByTestId('start-rep')).toHaveLength(1);
      expect(queryByText('CHESS · LEVEL 1 OF 6')).toBeNull();
    });

    describe('the nudge above the title', () => {
      it('asks for the first session when there has never been one', async () => {
        const { getByTestId } = await renderScreen(<TodayScreen />);
        const page = within(getByTestId('hero-page-path_guitar'));

        expect(page.getByText('One session starts the streak')).toBeOnTheScreen();
      });

      it('says today is in once it has been practised', async () => {
        mockEntries = [entryDaysAgo(0)];

        const { getByTestId } = await renderScreen(<TodayScreen />);
        const page = within(getByTestId('hero-page-path_guitar'));

        expect(page.getByText('1-day streak · today is in')).toBeOnTheScreen();
      });

      /** A day not yet practised must not read as a broken streak at 9am. */
      it("holds yesterday's streak and says what is at stake", async () => {
        mockEntries = [entryDaysAgo(1)];

        const { getByTestId } = await renderScreen(<TodayScreen />);
        const page = within(getByTestId('hero-page-path_guitar'));

        expect(page.getByText('1-day streak · today keeps it alive')).toBeOnTheScreen();
      });

      it('offers a restart rather than a scolding after a lapse', async () => {
        mockEntries = [entryDaysAgo(6)];

        const { getByTestId } = await renderScreen(<TodayScreen />);
        const page = within(getByTestId('hero-page-path_guitar'));

        expect(page.getByText('A short session restarts the streak')).toBeOnTheScreen();
      });

      /** Half-finished work is a better reason to open the app than a streak. */
      it('points at the half-done level ahead of the calendar', async () => {
        const halfDone: LearningPath = {
          ...guitarPath,
          techniques: guitarPath.techniques.map((item) =>
            item.id === 'tec_2' ? { ...item, practiceMinutes: 12 } : item,
          ),
        };
        mockPathState = { path: halfDone, loading: false };
        mockPathsById = { path_guitar: halfDone };
        mockEntries = [entryDaysAgo(0)];

        const { getByTestId } = await renderScreen(<TodayScreen />);
        const page = within(getByTestId('hero-page-path_guitar'));

        expect(page.getByText('One solid rep and the next level opens')).toBeOnTheScreen();
      });
    });
  });

  describe('the panels below', () => {
    it('offers a way to log practice that happened away from the phone', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);

      await fireEvent.press(getByTestId('insight-log'));

      expect(mockPush).toHaveBeenCalledWith('/practice/tec_2');
    });

    it('reports the week as minutes, sessions hit and levels cleared', async () => {
      mockEntries = [entryDaysAgo(0, 'solid'), entryDaysAgo(1)];

      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('40 min total')).toBeOnTheScreen();
      expect(getByText('2/5')).toBeOnTheScreen();
      expect(getByText('20 min')).toBeOnTheScreen();
      expect(getByText('Sessions hit')).toBeOnTheScreen();
    });

    /** The gate is named after its capstone, not "Stage 1". */
    it('names the next gate and how far off it is', async () => {
      const { getByText, getByTestId } = await renderScreen(<TodayScreen />);

      expect(getByText('Barre chords')).toBeOnTheScreen();
      expect(
        getByText('2 more techniques and the gate opens — badge, and the next stage unlocks.'),
      ).toBeOnTheScreen();

      await fireEvent.press(getByTestId('next-gate'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/path');
    });

    it('counts the whole history, not just this week', async () => {
      mockEntries = [entryDaysAgo(0), entryDaysAgo(30)];

      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText(/2 sessions$/)).toBeOnTheScreen();
    });

    /**
     * A grid of empty squares on somebody's first day reads as a wall of
     * missed days they never had a chance to fill.
     */
    it('shows no heatmap until there is a history to draw', async () => {
      const { queryByText } = await renderScreen(<TodayScreen />);

      expect(queryByText('The whole path')).toBeNull();
    });

    it('stands in for the heatmap while the history is loading', async () => {
      mockHistoryLoading = true;

      const { getByText, queryByText } = await renderScreen(<TodayScreen />);

      expect(getByText('The whole path')).toBeOnTheScreen();
      // No count, because it is not known yet.
      expect(queryByText(/sessions$/)).toBeNull();
    });
  });

  describe('the notes section', () => {
    it('puts the learner’s own words back in front of them', async () => {
      mockNotes = [note({ id: 'note_1' })];

      const { getByText, getByTestId, getAllByText } = await renderScreen(<TodayScreen />);

      expect(getByText('You said')).toBeOnTheScreen();
      expect(getByTestId('said-note_1')).toBeOnTheScreen();
      // Twice on purpose: quoted here, and again as the subtitle of the resume
      // row, where it is what makes the timestamp recognisable.
      expect(
        getAllByText('Pivot finger trick actually works. G to C is nearly clean.'),
      ).toHaveLength(2);
    });

    it('says when and where each note was taken', async () => {
      mockNotes = [note({ id: 'note_1' })];

      const { getByText } = await renderScreen(<TodayScreen />);

      // Date, technique, and how far into the resource - all three are what
      // make a three-week-old note recognisable.
      expect(getByText(/Chord transitions · 3:42$/)).toBeOnTheScreen();
    });

    it('reopens a note at the second it was taken', async () => {
      mockNotes = [note({ id: 'note_1' })];

      const { getByTestId } = await renderScreen(<TodayScreen />);

      await fireEvent.press(getByTestId('said-note_1'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/technique/[id]',
        params: { id: 'tec_2', seek: '222' },
      });
    });

    it('does not seek when the note was not anchored to a moment', async () => {
      mockNotes = [note({ id: 'note_1', resourceId: null, timestampSec: null })];

      const { getByTestId } = await renderScreen(<TodayScreen />);

      await fireEvent.press(getByTestId('said-note_1'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/technique/[id]',
        params: { id: 'tec_2' },
      });
    });

    /** A heading over nothing is worse than no heading. */
    it('is absent when nothing has been written', async () => {
      const { queryByText } = await renderScreen(<TodayScreen />);

      expect(queryByText('You said')).toBeNull();
    });
  });

  describe('the video section', () => {
    beforeEach(() => {
      mockPathState = {
        path: {
          ...guitarPath,
          techniques: guitarPath.techniques.map((item) =>
            item.id === 'tec_2' ? { ...item, resources: [resource({ id: 'res_1' })] } : item,
          ),
        },
        loading: false,
      };
    });

    it('shelves what has been curated but not finished', async () => {
      const { getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('Saved for later')).toBeOnTheScreen();
      expect(getByText('Fast chord changes: the pivot trick')).toBeOnTheScreen();
      expect(getByText('Paul Davids · 13:04')).toBeOnTheScreen();
    });

    it('opens the technique the video belongs to', async () => {
      const { getByTestId } = await renderScreen(<TodayScreen />);

      await fireEvent.press(getByTestId('saved-res_1'));

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_2');
    });

    /** A finished technique is not "saved for later" - it is done. */
    it('drops a resource once its technique is complete', async () => {
      mockPathState = {
        path: {
          ...guitarPath,
          techniques: guitarPath.techniques.map((item) =>
            item.id === 'tec_2'
              ? { ...item, status: 'completed' as const, resources: [resource({ id: 'res_1' })] }
              : item,
          ),
        },
        loading: false,
      };

      const { queryByTestId, queryByText } = await renderScreen(<TodayScreen />);

      expect(queryByTestId('saved-res_1')).toBeNull();
      expect(queryByText('Saved for later')).toBeNull();
    });
  });

  describe('picking up where you stopped', () => {
    it('resumes at the furthest point noted in a resource', async () => {
      mockNotes = [
        note({ id: 'early', timestampSec: 45, createdAt: '2026-09-04T09:00:00.000Z' }),
        note({ id: 'late', timestampSec: 222, createdAt: '2026-09-04T10:00:00.000Z' }),
      ];

      const { getByTestId, getByText } = await renderScreen(<TodayScreen />);

      expect(getByText('3:42')).toBeOnTheScreen();

      await fireEvent.press(getByTestId('resume-res_1'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/technique/[id]',
        params: { id: 'tec_2', seek: '222' },
      });
    });

    it('is absent when no note has a moment attached', async () => {
      mockNotes = [note({ id: 'note_1', resourceId: null, timestampSec: null })];

      const { queryByText } = await renderScreen(<TodayScreen />);

      expect(queryByText('Pick up where you stopped')).toBeNull();
    });
  });

  describe('opening a day in the week strip', () => {
    beforeEach(() => {
      mockEntries = [entryDaysAgo(1, 'struggling'), entryDaysAgo(1, 'solid'), entryDaysAgo(4)];
    });

    it('says what was practised, for how long, and how it went', async () => {
      const { getByTestId, getByText } = await renderScreen(<TodayScreen />);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const key = toLocalDay(yesterday);

      await fireEvent.press(getByTestId(`week-day-${key}`));

      // Two sessions on that day, summed in the heading.
      expect(getByText(new RegExp('· 40 min$'))).toBeOnTheScreen();
      expect(getByText('Struggling')).toBeOnTheScreen();
      expect(getByText('Solid')).toBeOnTheScreen();
    });

    /** The strip already resolves ids to titles nowhere else, so it must here. */
    it('names the technique rather than showing its id', async () => {
      const { getByTestId, getAllByText } = await renderScreen(<TodayScreen />);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await fireEvent.press(getByTestId(`week-day-${toLocalDay(yesterday)}`));

      // Both sessions were on tec_2, which is Chord transitions.
      expect(getAllByText('Chord transitions').length).toBeGreaterThanOrEqual(2);
    });

    it('closes again, from the panel or by tapping the day twice', async () => {
      const { getByTestId, queryByTestId } = await renderScreen(<TodayScreen />);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const key = toLocalDay(yesterday);

      await fireEvent.press(getByTestId(`week-day-${key}`));
      await fireEvent.press(getByTestId('day-panel-close'));
      expect(queryByTestId('day-panel-close')).toBeNull();

      await fireEvent.press(getByTestId(`week-day-${key}`));
      await fireEvent.press(getByTestId(`week-day-${key}`));
      expect(queryByTestId('day-panel-close')).toBeNull();
    });

    /** A day with nothing on it would open a panel that says nothing. */
    it('ignores a day with no practice', async () => {
      const { getByTestId, queryByTestId } = await renderScreen(<TodayScreen />);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      await fireEvent.press(getByTestId(`week-day-${toLocalDay(threeDaysAgo)}`));

      expect(queryByTestId('day-panel-close')).toBeNull();
    });
  });

  /**
   * Swiping to another hobby refetches only that hobby. The panels that do not
   * depend on it must not blink, or a swipe looks like a cold start.
   */
  describe('while a hobby is loading', () => {
    beforeEach(() => {
      mockPathState = { path: null, loading: true };
      mockEntries = [entryDaysAgo(0)];
    });

    it('holds the panels that a swipe does not change', async () => {
      const { getByText } = await renderScreen(<TodayScreen />);

      // The week belongs to the learner, not to one path.
      expect(getByText('Last 7 days')).toBeOnTheScreen();
      expect(getByText('Sessions hit')).toBeOnTheScreen();
    });

    it('stands in for the panels it does change', async () => {
      const { getByText, queryByText, queryByTestId } = await renderScreen(<TodayScreen />);

      // Headings stay, so the page does not reflow around the placeholders.
      expect(getByText('My practice today')).toBeOnTheScreen();
      expect(getByText('Next gate')).toBeOnTheScreen();
      // Their contents are not invented while they are unknown.
      expect(queryByTestId('insight-mastery')).toBeNull();
      expect(queryByText('Barre chords')).toBeNull();
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
      mockList = {
        paths: [summary('path_guitar', 'guitar', 6)],
        focusedId: 'path_guitar',
        error: null,
        loading: false,
      };
    });

    it('says so rather than leaving the page empty', async () => {
      const { getByText, queryByTestId } = await renderScreen(<TodayScreen />);

      expect(getByText('Path complete')).toBeOnTheScreen();
      expect(queryByTestId('start-rep')).toBeNull();
    });

    /** There is no next gate on a finished path, so the card goes. */
    it('drops the gate card', async () => {
      const { queryByTestId } = await renderScreen(<TodayScreen />);

      expect(queryByTestId('next-gate')).toBeNull();
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
