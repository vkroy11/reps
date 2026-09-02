import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from '../src/app/index';

// Tests live outside src/app because Expo Router turns every file in there
// into a route - a test file would ship as a real screen.

/** Insets have no meaning in a test renderer, so they are supplied explicitly. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('HomeScreen', () => {
  // Testing Library v14 renders asynchronously.
  it('renders', async () => {
    const { getByText } = await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <HomeScreen />
      </SafeAreaProvider>,
    );

    expect(getByText('Reps')).toBeOnTheScreen();
  });
});
