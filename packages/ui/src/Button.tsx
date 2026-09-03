import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, hit, radius, space, springConfig } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Shrinks to 46px for inline use, e.g. three grading buttons in a row. */
  compact?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/** Elevation is a solid lower edge, not a shadow: identical on iOS, Android and web. */
const EDGE = 4;
const PRESSED_EDGE = 2;

type LabelTone = 'textOnBrand' | 'brand' | 'textSecondary';

/**
 * The disabled overrides are only set where the defaults would mislead. On a
 * brand panel, a light grey pill reads as an enabled white button and invites
 * the tap it is refusing - so inverse disables to a translucent white, and its
 * label stays white, because grey-on-that measures 1.42 and vanishes.
 */
const FILLS: Record<
  ButtonVariant,
  {
    fill: string;
    edge: string;
    label: LabelTone;
    disabledFill?: string;
    disabledLabel?: LabelTone;
  }
> = {
  primary: { fill: color.brand, edge: color.brandPressed, label: 'textOnBrand' },
  secondary: { fill: color.surfaceCard, edge: color.borderStrong, label: 'brand' },
  ghost: { fill: 'transparent', edge: 'transparent', label: 'brand' },
  danger: { fill: color.danger, edge: color.dangerPressed, label: 'textOnBrand' },
  /** For a brand-filled panel, where a brand button would be invisible. */
  inverse: {
    fill: color.textOnBrand,
    edge: color.brandSoft,
    label: 'brand',
    disabledFill: 'rgba(255,255,255,0.18)',
    disabledLabel: 'textOnBrand',
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  compact = false,
  fullWidth = true,
  style,
  testID,
}: ButtonProps) {
  const reduceMotion = useReduceMotion();
  const pressed = useSharedValue(0);

  // translateY only: animating height or padding would run layout every frame.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * PRESSED_EDGE }],
  }));

  const animatedEdge = useAnimatedStyle(() => ({
    borderBottomWidth: EDGE - pressed.value * PRESSED_EDGE,
  }));

  const setPressed = (value: number) => {
    pressed.value = reduceMotion
      ? withTiming(value, { duration: 0 })
      : withSpring(value, springConfig.press);
  };

  const tokens = FILLS[variant];
  const isFlat = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      // No hitSlop needed: the button is 46-56px tall, already above the
      // 44px minimum touch target.
      style={[fullWidth && styles.fullWidth, style]}
    >
      <Animated.View style={animatedStyle}>
        <Animated.View
          style={[
            styles.base,
            {
              height: compact ? 46 : hit.cta,
              backgroundColor: disabled
                ? (tokens.disabledFill ?? color.surfaceLocked)
                : tokens.fill,
              borderBottomColor: disabled ? color.borderDefault : tokens.edge,
            },
            variant === 'secondary' && styles.outlined,
            isFlat && styles.flat,
            !isFlat && animatedEdge,
          ]}
        >
          <Text
            variant={compact ? 'caption' : 'label'}
            tone={disabled ? (tokens.disabledLabel ?? 'textSecondary') : tokens.label}
            style={styles.label}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  base: {
    borderRadius: radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.base,
  },
  outlined: { borderWidth: 1.5, borderColor: color.borderStrong },
  flat: { borderBottomWidth: 0 },
  label: { textTransform: 'uppercase', letterSpacing: 0.6 },
});
