import type { NoteWithContext } from '@reps/core';
import { fireEvent, within } from '@testing-library/react-native';
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

  describe('with notes across two techniques', () => {
    beforeEach(() => {
      mockNotebook = {
        loading: false,
        notes: [
          note({ id: 'not_3', techniqueId: 'tec_2', techniqueTitle: 'Barre chords' }),
          note({
            id: 'not_2',
            timestampSec: 65,
            body: 'Slow down before speeding up.',
          }),
          note({ id: 'not_1', timestampSec: null, resourceId: null, body: 'Buy a capo.' }),
        ],
      };
    });

    it('groups notes under the technique they were taken on', async () => {
      const { getAllByText, getByText } = await renderScreen(<NotesScreen />);

      // One heading for tec_1, not two: its notes share it.
      expect(getAllByText('Chord transitions')).toHaveLength(1);
      expect(getByText('Barre chords')).toBeOnTheScreen();
      expect(getByText('3 notes across 2 techniques')).toBeOnTheScreen();
    });

    it('shows the moment a timestamped note belongs to', async () => {
      const { getByTestId } = await renderScreen(<NotesScreen />);

      expect(within(getByTestId('notebook-note-not_3')).getByText('3:42')).toBeOnTheScreen();
      expect(within(getByTestId('notebook-note-not_2')).getByText('1:05')).toBeOnTheScreen();
    });

    /** A note with no video has no moment, and must not be given a fake one. */
    it('shows no timestamp on an untimed note', async () => {
      const { getByTestId } = await renderScreen(<NotesScreen />);
      const row = within(getByTestId('notebook-note-not_1'));

      expect(row.getByText('Buy a capo.')).toBeOnTheScreen();
      expect(row.queryByText(/^\d+:\d\d$/)).toBeNull();
    });

    it('opens the technique a note was taken on', async () => {
      const { getByTestId } = await renderScreen(<NotesScreen />);

      await fireEvent.press(getByTestId('notebook-note-not_3'));

      expect(mockPush).toHaveBeenCalledWith('/technique/tec_2');
    });
  });
});
