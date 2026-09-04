import type { NoteWithContext } from '@reps/core';
import { fireEvent } from '@testing-library/react-native';
import NotesScreen from '../src/app/(tabs)/notes';
import { renderScreen } from './support/render-screen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

let mockNotebook: { notes: NoteWithContext[]; loading: boolean };

jest.mock('../src/features/notes/useNotes', () => ({
  useNotebook: () => ({ ...mockNotebook, error: null, reload: jest.fn() }),
}));

function note(overrides: Partial<NoteWithContext> & { id: string }): NoteWithContext {
  return {
    userId: 'usr_1',
    techniqueId: 'tec_1',
    resourceId: 'res_1',
    timestampSec: 222,
    body: 'Thumb behind the neck, not over it.',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    techniqueTitle: 'Chord transitions',
    pathId: 'path_guitar',
    skill: 'guitar',
    ...overrides,
  };
}

describe('NotesScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockNotebook = { notes: [], loading: false };
  });

  it('says how to make a note rather than showing an empty list', async () => {
    const { getByText } = await renderScreen(<NotesScreen />);

    expect(getByText(/Open a technique and tap/)).toBeOnTheScreen();
  });

  describe('with notes of both kinds', () => {
    beforeEach(() => {
      mockNotebook = {
        loading: false,
        notes: [
          note({ id: 'not_3', techniqueId: 'tec_2', techniqueTitle: 'Barre chords' }),
          note({ id: 'not_2', timestampSec: 65, body: 'Slow down before speeding up.' }),
          note({ id: 'not_1', timestampSec: null, resourceId: null, body: 'Buy a capo.' }),
        ],
      };
    });

    it('counts what is there', async () => {
      const { getByText } = await renderScreen(<NotesScreen />);

      expect(getByText('3 notes')).toBeOnTheScreen();
    });

    it('says which technique each note came from', async () => {
      const { getByText, getAllByText } = await renderScreen(<NotesScreen />);

      expect(getByText('Barre chords')).toBeOnTheScreen();
      expect(getAllByText('Chord transitions')).toHaveLength(2);
    });

    /**
     * The footer line is a promise about where tapping goes. A label that
     * named a moment the destination ignored would teach the learner to
     * distrust all of them.
     */
    it('promises the exact moment a video note jumps to', async () => {
      const { getByText } = await renderScreen(<NotesScreen />);

      expect(getByText('Jump to 3:42 in the video')).toBeOnTheScreen();
      expect(getByText('Jump to 1:05 in the video')).toBeOnTheScreen();
    });

    it('promises only the technique for a note with no moment', async () => {
      const { getByText } = await renderScreen(<NotesScreen />);

      expect(getByText('Open the technique')).toBeOnTheScreen();
    });

    it('carries the anchor through the route, so the promise is kept', async () => {
      const { getByTestId } = await renderScreen(<NotesScreen />);

      await fireEvent.press(getByTestId('note-card-not_3'));

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_2?seek=222');
    });

    it('sends an untimed note to the technique with no anchor', async () => {
      const { getByTestId } = await renderScreen(<NotesScreen />);

      await fireEvent.press(getByTestId('note-card-not_1'));

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_1');
    });

    describe('filters', () => {
      it('counts each kind so an empty filter is predictable', async () => {
        const { getByText } = await renderScreen(<NotesScreen />);

        expect(getByText('Video · 2')).toBeOnTheScreen();
        expect(getByText('Technique · 1')).toBeOnTheScreen();
      });

      it('narrows to video notes', async () => {
        const { getByTestId, queryByTestId } = await renderScreen(<NotesScreen />);

        await fireEvent.press(getByTestId('filter-Video'));

        expect(getByTestId('note-card-not_3')).toBeOnTheScreen();
        expect(queryByTestId('note-card-not_1')).toBeNull();
      });

      it('narrows to notes with no video', async () => {
        const { getByTestId, queryByTestId } = await renderScreen(<NotesScreen />);

        await fireEvent.press(getByTestId('filter-Technique'));

        expect(getByTestId('note-card-not_1')).toBeOnTheScreen();
        expect(queryByTestId('note-card-not_3')).toBeNull();
      });

      /** An empty filter must say why it is empty, not just show nothing. */
      it('explains an empty filter', async () => {
        mockNotebook = {
          loading: false,
          notes: [note({ id: 'not_1', timestampSec: null, resourceId: null })],
        };

        const { getByTestId, getByText } = await renderScreen(<NotesScreen />);

        await fireEvent.press(getByTestId('filter-Video'));

        expect(getByText('No video notes yet.')).toBeOnTheScreen();
      });
    });
  });
});
