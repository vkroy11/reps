import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface KeyboardAvoiderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen container that keeps the focused input and the sticky CTA above the
 * keyboard.
 *
 * This has to be the screen's own outermost view, not a wrapper around the
 * navigator. `KeyboardAvoidingView` works by adding padding (or shrinking its
 * own height) and letting its children reflow; a navigator's screens are laid
 * out inside their own full-height containers, so padding applied above them
 * changes nothing that the content can see. That was the first attempt, and it
 * did nothing.
 *
 * `behavior` per the React Native docs: `padding` on iOS, `height` on Android.
 * Android also resizes the window itself, but the two agree rather than fight -
 * `height` measures the space that is actually left.
 */
export function KeyboardAvoider({ children, style }: KeyboardAvoiderProps) {
  // Still a real View on web, not a fragment: this is the screen's container,
  // so dropping the style takes the layout and the panel colour with it.
  if (Platform.OS === 'web') {
    return <View style={[styles.fill, style]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.fill, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
