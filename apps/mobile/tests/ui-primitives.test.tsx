import { Button, Chip, PipLogo, Skeleton, Text, color, typeScale } from '@reps/ui';
import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { View } from 'react-native';

describe('Text', () => {
  it('applies the type scale and tone from tokens', async () => {
    const { getByText } = await render(
      <Text variant="display" tone="brand">
        Chord transitions
      </Text>,
    );

    expect(getByText('Chord transitions')).toHaveStyle({
      fontSize: typeScale.display.fontSize,
      fontFamily: typeScale.display.fontFamily,
      color: color.brand,
    });
  });
});

describe('Button', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Start practice" onPress={onPress} />);

    await fireEvent.press(getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Continue" disabled onPress={onPress} />);

    await fireEvent.press(getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('Chip', () => {
  it('reports its selected state to assistive tech', async () => {
    const { getByRole } = await render(<Chip label="Video" selected />);

    expect(getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
  });

  /** Multi-select is the interaction onboarding Q5 depends on. */
  it('toggles when tapped', async () => {
    function Harness() {
      const [on, setOn] = useState(false);

      return (
        <View>
          <Chip label="Video" selected={on} onPress={() => setOn((value) => !value)} />
          <Text>{on ? 'selected' : 'unselected'}</Text>
        </View>
      );
    }

    const { getByRole, getByText } = await render(<Harness />);
    expect(getByText('unselected')).toBeOnTheScreen();

    await fireEvent.press(getByRole('button'));
    expect(getByText('selected')).toBeOnTheScreen();

    await fireEvent.press(getByRole('button'));
    expect(getByText('unselected')).toBeOnTheScreen();
  });
});

describe('Skeleton', () => {
  it('announces itself as loading rather than being silent', async () => {
    const { getByLabelText } = await render(<Skeleton height={74} />);

    expect(getByLabelText('Loading')).toBeOnTheScreen();
  });
});

describe('PipLogo', () => {
  it('renders every expression without changing the silhouette', async () => {
    for (const expression of ['idle', 'think', 'cheer', 'struggle'] as const) {
      const { getByTestId } = await render(
        <PipLogo expression={expression} testID={`pip-${expression}`} animate={false} />,
      );

      expect(getByTestId(`pip-${expression}`)).toBeOnTheScreen();
    }
  });

  it('is a button only when it has a press handler', async () => {
    const passive = await render(<PipLogo animate={false} testID="pip-passive" />);
    expect(passive.queryByRole('button')).toBeNull();

    const active = await render(<PipLogo animate={false} onPress={() => {}} />);
    expect(active.getByRole('button')).toBeOnTheScreen();
  });
});
