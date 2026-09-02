import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** Insets have no meaning in a test renderer, so they are supplied explicitly. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Renders a screen with the providers every screen assumes. Screens that need
 * app state mock `../src/providers/app-provider` directly, which keeps these
 * tests free of storage and network.
 */
export function renderScreen(element: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>);
}
