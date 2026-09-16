import type { LearningPath } from '@reps/core';
import { fireEvent, waitFor } from '@testing-library/react-native';
import GeneratingScreen from '../src/app/generating';
import { renderScreen } from './support/render-screen';
import { resetStubPathCache, stubPathCache } from './support/stub-path-cache';

const mockReplace = jest.fn();
const mockCreatePath = jest.fn<Promise<LearningPath>, []>();
const mockFocusPath = jest.fn();
const mockClearDraft = jest.fn(async () => undefined);
const mockMarkOnboarded = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

jest.mock('../src/providers/app-provider', () => ({
  useApp: () => ({
    draft: {
      skill: 'guitar',
      goal: 'play 5 songs at a campfire',
      level: 'I know a few chords but changes are slow',
      dailyMinutes: 20,
      daysPerWeek: 5,
      preferredFormats: ['video'],
      language: 'en',
    },
    api: { createPath: mockCreatePath },
    focusPath: mockFocusPath,
    clearDraft: mockClearDraft,
    markOnboarded: mockMarkOnboarded,
  }),
}));

const CREATED: LearningPath = {
  id: 'path_chess',
  userId: 'usr_1',
  skill: 'chess',
  archetype: 'strategic',
  goal: 'stop losing pieces',
  level: 'I hang pieces in every game',
  dailyMinutes: 20,
  daysPerWeek: 5,
  preferredFormats: ['video'],
  language: 'en',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
  xp: 0,
  badges: [],
  techniques: [],
};

describe('generating a path', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockCreatePath.mockReset();
    mockFocusPath.mockClear();
    mockClearDraft.mockClear();
    mockMarkOnboarded.mockClear();
    mockCreatePath.mockResolvedValue(CREATED);
    resetStubPathCache();
  });

  it('folds the new path into the cache so a second hobby appears without a restart', async () => {
    await renderScreen(<GeneratingScreen />);

    await waitFor(() => expect(mockCreatePath).toHaveBeenCalled());
    await waitFor(() => expect(stubPathCache.applyPath).toHaveBeenCalledWith(CREATED));
    expect(mockFocusPath).toHaveBeenCalledWith('path_chess');
  });

  it('still focuses the new path if create succeeds', async () => {
    const { findByTestId } = await renderScreen(<GeneratingScreen />);
    fireEvent.press(await findByTestId('go-to-today'));

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
