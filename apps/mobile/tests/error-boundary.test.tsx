import { fireEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { renderScreen } from './support/render-screen';

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('player died');

  return <Text>playing</Text>;
}

function Harness() {
  const [generation, setGeneration] = useState(0);
  const [shouldThrow, setShouldThrow] = useState(true);

  return (
    <View>
      <ErrorBoundary
        resetKey={String(generation)}
        fallback={
          <View>
            <Text>fallback</Text>
            <Pressable
              testID="retry"
              onPress={() => {
                setShouldThrow(false);
                setGeneration((value) => value + 1);
              }}
            >
              <Text>retry</Text>
            </Pressable>
          </View>
        }
      >
        <Boom shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </View>
  );
}

describe('ErrorBoundary', () => {
  let consoleError: typeof console.error;

  beforeEach(() => {
    consoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = consoleError;
  });

  it('shows the fallback instead of crashing the screen', async () => {
    const { getByText, queryByText } = await renderScreen(<Harness />);

    expect(getByText('fallback')).toBeOnTheScreen();
    expect(queryByText('playing')).toBeNull();
  });

  it('remounts the child after resetKey changes', async () => {
    const { getByTestId, getByText } = await renderScreen(<Harness />);

    fireEvent.press(getByTestId('retry'));

    await waitFor(() => expect(getByText('playing')).toBeOnTheScreen());
  });
});
