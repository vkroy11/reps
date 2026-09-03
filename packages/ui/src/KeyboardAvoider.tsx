import { KeyboardAvoidingView, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export interface KeyboardAvoiderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Keeps the focused input and the sticky CTA above the keyboard.
 *
 * The two platforms need opposite things, which is why this is a component and
 * not a prop passed around:
 *
 *   - **iOS** gives the app no help at all. The window keeps its full height
 *     and the keyboard covers the bottom, so a `padding` inset is the only way
 *     the footer button stays reachable.
 *   - **Android** already resizes the window, because Expo's default
 *     `android.softwareKeyboardLayoutMode` is `resize`. Wrapping it in a second
 *     avoiding view double-counts the inset and leaves a keyboard-sized gap
 *     under the content, so this deliberately does nothing there.
 *   - **Web** has no software keyboard to avoid.
 *
 * Mounted once around the navigator, so no screen has to remember it. Screens
 * still need `keyboardShouldPersistTaps="handled"` on a scroll view if a tap
 * target sits beside the input - that one is per-screen behaviour, not layout.
 */
export function KeyboardAvoider({ children, style }: KeyboardAvoiderProps) {
  if (Platform.OS !== 'ios') {
    return <>{children}</>;
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
