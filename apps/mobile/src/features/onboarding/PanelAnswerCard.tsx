import { Text, accentOn, inkOn, motion, radius, space, useReduceMotion, type Panel } from '@reps/ui';
import Check from 'lucide-react-native/icons/check';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export interface PanelAnswerCardProps {
  label: string;
  description?: string;
  /** A digit or glyph in the left medal. Model-written options carry one. */
  badge?: string;
  panel: Panel;
  selected: boolean;
  onPress: () => void;
  /** Staggers the entrance, so a list of three arrives rather than appearing. */
  index?: number;
  testID?: string;
}

/**
 * One model-written answer: medal, label, the line explaining what picking it
 * changes, and a tick.
 *
 * The description is the part that earns the card its height. Three options
 * that only differ by wording are a worse question than three chips; these say
 * what each answer does to the path, which is the actual decision.
 */
export function PanelAnswerCard({
  label,
  description,
  badge,
  panel,
  selected,
  onPress,
  index = 0,
  testID,
}: PanelAnswerCardProps) {
  const reduceMotion = useReduceMotion();
  const entrance = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      entrance.value = 1;

      return;
    }

    entrance.value = withDelay(index * motion.cardStagger, withTiming(1, motion.cardEntrance));
  }, [entrance, index, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 14 }],
  }));

  const accent = accentOn(panel);
  const ink = selected ? inkOn(panel) : panel.ink;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={description === undefined ? label : `${label}. ${description}`}
        testID={testID}
        onPress={onPress}
        style={[
          styles.card,
          selected
            ? { backgroundColor: accent }
            : { backgroundColor: panel.tile, borderColor: panel.ghost },
        ]}
      >
        {badge === undefined ? null : (
          <View
            style={[
              styles.medal,
              { backgroundColor: selected ? 'rgba(255,255,255,0.24)' : panel.ghost },
            ]}
          >
            <Text variant="label" style={{ color: ink }}>
              {badge}
            </Text>
          </View>
        )}

        <View style={styles.copy}>
          <Text variant="heading" style={[styles.label, { color: ink }]}>
            {label}
          </Text>
          {description === undefined ? null : (
            <Text variant="caption" style={[styles.description, { color: ink }]}>
              {description}
            </Text>
          )}
        </View>

        <View
          style={[styles.tick, selected ? { backgroundColor: ink } : { backgroundColor: panel.ghost }]}
        >
          {selected ? <Check size={15} color={accent} strokeWidth={3.2} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
  },
  medal: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 17, lineHeight: 23 },
  // 0.72 rather than a second token: on a selected card the description sits on
  // the accent fill, where any of our secondary inks would fail contrast.
  description: { marginTop: space.xs, lineHeight: 19, opacity: 0.72 },
  tick: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
});
