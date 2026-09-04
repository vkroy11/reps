import { GATE_EVERY, clearedStages, stageCount, type LearningPathSummary } from '@reps/core';
import { Text, color, motion, radius, space, useReduceMotion } from '@reps/ui';
import Plus from 'lucide-react-native/icons/plus';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface HeroPagerProps {
  paths: LearningPathSummary[];
  /** Index of the path currently in focus, so the pager opens on it. */
  initialIndex: number;
  onFocus: (pathId: string) => void;
  onAddPath: () => void;
  /** Width of one page. The panel's own width, set by whatever contains it. */
  pageWidth: number;
  renderPage: (path: LearningPathSummary) => React.ReactNode;
}

/**
 * One page per path, plus a final page for starting another hobby.
 *
 * A pager rather than a dropdown switcher, which is what this screen used
 * before. Two hobbies are a peer relationship: a dropdown makes one of them
 * the real answer and the other a setting you have to go and find. Swiping
 * says they are the same kind of thing.
 *
 * Paging is native `pagingEnabled` on a horizontal ScrollView, so the swipe
 * never touches JavaScript. The page index is read from the scroll offset on
 * settle, which is the one moment React needs to know about.
 */
export function HeroPager({
  paths,
  initialIndex,
  onFocus,
  onAddPath,
  pageWidth,
  renderPage,
}: HeroPagerProps) {
  const [index, setIndex] = useState(initialIndex);
  const scroller = useRef<ScrollView>(null);

  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next === index) return;

    setIndex(next);
    const path = paths[next];
    // The last page is "start something new" and focuses nothing.
    if (path) onFocus(path.id);
  };

  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettle}
        contentOffset={{ x: initialIndex * pageWidth, y: 0 }}
        style={{ width: pageWidth }}
        scrollEventThrottle={16}
      >
        {paths.map((path) => (
          <View key={path.id} style={{ width: pageWidth }}>
            {renderPage(path)}
          </View>
        ))}

        <View style={{ width: pageWidth }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start another hobby"
            onPress={onAddPath}
            style={styles.addPage}
            testID="add-path"
          >
            <View style={styles.addGlyph}>
              <Plus size={26} color={color.brand} strokeWidth={2.6} />
            </View>
            <Text variant="heading" center>
              Start another hobby
            </Text>
            <Text variant="caption" tone="textSecondary" center style={styles.addCopy}>
              Reps keeps them separate. Nothing you have built here changes.
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {paths.length > 0 ? (
        <View style={styles.dots}>
          {[...paths, null].map((path, dotIndex) => (
            <Dot
              key={path?.id ?? 'new'}
              active={dotIndex === index}
              onPress={() => {
                setIndex(dotIndex);
                scroller.current?.scrollTo({ x: dotIndex * pageWidth, animated: true });
                if (path) onFocus(path.id);
              }}
              label={path ? path.skill : 'Start another hobby'}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The active dot widens rather than changing size, so the row never reflows. */
function Dot({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  const reduceMotion = useReduceMotion();
  const width = useSharedValue(active ? 22 : 7);

  width.value = reduceMotion ? (active ? 22 : 7) : withTiming(active ? 22 : 7, motion.dot);

  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={10}
    >
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: active ? color.brand : color.borderStrong },
          animatedStyle,
        ]}
      />
    </Pressable>
  );
}

/** The next gate, phrased as what it unlocks rather than as a number. */
export function nextGateLine(summary: LearningPathSummary): string | null {
  const stages = stageCount(summary.techniqueCount);
  const cleared = clearedStages(summary.completedCount, summary.techniqueCount);
  if (cleared >= stages) return null;

  const remaining = GATE_EVERY - (summary.completedCount % GATE_EVERY);

  return `${remaining} more ${remaining === 1 ? 'technique' : 'techniques'} clears gate ${cleared + 1} of ${stages}`;
}

const styles = StyleSheet.create({
  addPage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xl,
    paddingHorizontal: space.base,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: color.borderDefault,
    borderStyle: 'dashed',
    minHeight: 210,
    marginHorizontal: space.base,
  },
  addGlyph: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCopy: { maxWidth: 260 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.base,
  },
  dot: { height: 7, borderRadius: radius.full },
});
