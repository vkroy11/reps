import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StubPathCache } from './stub-path-cache';

/** Insets have no meaning in a test renderer, so they are supplied explicitly. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Renders a screen with the providers every screen assumes.
 *
 * The path cache is stubbed rather than real: screen tests are about what the
 * screen does with data, and the real provider fetches. Its own behaviour -
 * memoising, patching summaries after a mutation, remembering what the board
 * has shown - is covered in path-cache.test.tsx against a fake client.
 *
 * Screens that need app state mock `../src/providers/app-provider` directly,
 * which keeps these tests free of storage and network.
 */
export function renderScreen(element: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <StubPathCache>{element}</StubPathCache>
    </SafeAreaProvider>,
  );
}
