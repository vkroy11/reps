import type { ContentFormat } from '@reps/core';
import { Text, accentOn, inkOn, space, springConfig, useReduceMotion, type Panel } from '@reps/ui';
import BookOpen from 'lucide-react-native/icons/book-open';
import Check from 'lucide-react-native/icons/check';
import Layers from 'lucide-react-native/icons/layers';
import Play from 'lucide-react-native/icons/play';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** One glyph per format, imported one at a time - the barrel costs 1.9 MB. */
const GLYPHS: Record<ContentFormat, typeof Play> = {
  video: Play,
  drill: Check,
  article: BookOpen,
  flashcards: Layers,
  ai_lesson: BookOpen,
};

export interface FormatTileProps {
  label: string;
  hint: string;
  format: ContentFormat;
  panel: Panel;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * A format in a 2×2 grid: glyph, name, and one line saying what it is.
 *
 * Two columns rather than a chip row, because this is the only multi-select in
 * the flow. Chips read as "pick one" no matter how many are lit; tiles that are
 * large enough to hold a description read as a checklist.
 */
export function FormatTile({
  label,
  hint,
  format,
  panel,
  selected,
  onPress,
  testID,
}: FormatTileProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const Glyph = GLYPHS[format];

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = (target: number) => {
    scale.value = reduceMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(target, springConfig.press);
  };

  const accent = accentOn(panel);
  const ink = selected ? inkOn(panel) : panel.ink;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${hint}`}
      testID={testID}
      onPress={onPress}
      onPressIn={() => press(0.97)}
      onPressOut={() => press(1)}
      style={styles.wrap}
    >
      <Animated.View
        style={[
          styles.tile,
          selected
            ? { backgroundColor: accent }
            : { backgroundColor: panel.tile, borderColor: panel.ghost },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.glyph,
            { backgroundColor: selected ? 'rgba(255,255,255,0.24)' : panel.ghost },
          ]}
        >
          <Glyph size={22} color={ink} strokeWidth={2.4} />
        </View>
        <Text variant="label" style={{ color: ink }}>
          {label}
        </Text>
        <Text variant="caption" style={[styles.hint, { color: ink }]}>
          {hint}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Half the row minus half the 11px gap, so two fit per line at any width.
  wrap: { flexGrow: 1, flexBasis: '46%' },
  tile: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 5,
    padding: space.base,
    borderRadius: 20,
    borderWidth: 1,
  },
  glyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  // 0.7 rather than a second ink token: on a selected tile the hint sits on the
  // accent fill, where any of our secondary greys would fail contrast.
  hint: { opacity: 0.7, lineHeight: 17 },
});
