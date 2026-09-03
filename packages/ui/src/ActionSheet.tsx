import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useBreakpoint } from './hooks/useBreakpoint';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, duration, easing, radius, space } from './tokens';

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
}

/**
 * The one place that decides sheet versus dialog.
 *
 * Under the wide breakpoint this anchors to the bottom edge with a grab
 * handle, which is where a thumb is. Above it, the same content becomes a
 * centred dialog, because a full-width sheet on a desktop window is a mobile
 * pattern wearing the wrong clothes.
 *
 * Callers pass content only; they never check Platform.OS.
 */
export function ActionSheet({
  visible,
  onClose,
  children,
  accessibilityLabel = 'Actions',
}: ActionSheetProps) {
  const { isWide } = useBreakpoint();
  const reduceMotion = useReduceMotion();
  const entrance = useSharedValue(0);

  useEffect(() => {
    const curve = visible ? easing.standard : easing.exit;

    entrance.value = reduceMotion
      ? withTiming(visible ? 1 : 0, { duration: 0 })
      : withTiming(visible ? 1 : 0, {
          duration: visible ? duration.base : duration.fast,
          easing: Easing.bezier(curve[0], curve[1], curve[2], curve[3]),
        });
  }, [visible, entrance, reduceMotion]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: entrance.value }));

  // translateY on the phone, scale on wide: both transforms, so neither runs layout.
  const panelStyle = useAnimatedStyle(() =>
    isWide
      ? {
          opacity: entrance.value,
          transform: [{ scale: 0.96 + entrance.value * 0.04 }],
        }
      : {
          transform: [{ translateY: (1 - entrance.value) * 32 }],
          opacity: entrance.value,
        },
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.root, isWide && styles.rootWide]}>
        <Animated.View style={[styles.scrimFill, scrimStyle]}>
          <Pressable
            style={styles.scrimFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[isWide ? styles.dialog : styles.sheet, panelStyle]}
        >
          {isWide ? null : <View style={styles.grab} />}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  rootWide: { justifyContent: 'center', alignItems: 'center' },
  scrimFill: { position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, backgroundColor: 'rgba(15,23,42,0.42)' },
  sheet: {
    backgroundColor: color.surfaceCard,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.base,
    paddingTop: space.md,
    maxHeight: '86%',
  },
  dialog: {
    backgroundColor: color.surfaceCard,
    borderRadius: radius.card,
    padding: space.lg,
    width: '100%',
    maxWidth: 460,
    maxHeight: '86%',
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: color.borderStrong,
    alignSelf: 'center',
    marginBottom: space.base,
  },
});
