import { GATE_EVERY, capstoneOf, masteryOf, type Technique } from '@reps/core';
import {
  PathNode,
  Text,
  board,
  color,
  layoutBoard,
  motion,
  radius,
  trailPath,
  trailProgress,
  useReduceMotion,
  type PathNodeStatus,
} from '@reps/ui';
import Star from 'lucide-react-native/icons/star';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { PathGate } from './PathGate';
import { useUnlockSequence } from './useUnlockSequence';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface PathBoardProps {
  techniques: Technique[];
  /** The goal, shown at the finish marker so the map has a destination. */
  goal: string;
  /**
   * Completions this board has already shown, when that differs from the
   * current count. The trail animates from there, which is how a completion
   * made on another screen is played out on arrival.
   */
  seenDone: number | null;
  /** Called once the unlock has played, so it happens exactly once. */
  onUnlockPlayed: (doneCount: number) => void;
  onSelect: (techniqueId: string) => void;
}

/**
 * The path as a board-game map: a serpentine trail, numbered level discs,
 * milestone gates and a finish marker.
 *
 * Memoised on the technique list because the trail geometry is recomputed from
 * scratch on every render, and the parent re-renders whenever the sheet opens.
 */
export const PathBoard = memo(function PathBoard({
  techniques,
  goal,
  seenDone,
  onUnlockPlayed,
  onSelect,
}: PathBoardProps) {
  const reduceMotion = useReduceMotion();
  const { items, centres, height } = layoutBoard(techniques.length, GATE_EVERY);
  const { d, lengths, total } = trailPath(centres);

  /*
    Derived from status rather than from a separate counter. `skipped`
    techniques stay on the board as removed, so counting them as done would
    push the trail past a node the learner never did - completed is the only
    thing that advances the fill.
  */
  const doneCount = techniques.filter((technique) => technique.status === 'completed').length;
  const activeIndex = techniques.findIndex((technique) => technique.status === 'active');

  const played = useCallback(() => onUnlockPlayed(doneCount), [onUnlockPlayed, doneCount]);
  const { trail, entrance, playing } = useUnlockSequence({
    progress: trailProgress(lengths, total, doneCount),
    // Only a genuine advance animates. Anything else settles.
    from:
      seenDone !== null && seenDone < doneCount
        ? trailProgress(lengths, total, seenDone)
        : null,
    onPlayed: played,
  });

  const trailProps = useAnimatedProps(() => ({
    strokeDashoffset: total * (1 - trail.value),
  }));

  const entranceStyle = useAnimatedStyle(() => {
    if (playing.value === 0) return {};

    return {
      opacity: entrance.value,
      transform: [
        { translateY: (1 - entrance.value) * motion.unlockRise },
        {
          scale:
            motion.unlockScaleFrom + entrance.value * (1 - motion.unlockScaleFrom),
        },
      ],
    };
  });

  return (
    <View style={[styles.board, { height }]}>
      {/*
        Three stacked strokes: a track showing where the path goes, a dotted
        overlay so the unwalked part reads as "not yet", and the progress fill
        on top. pointerEvents none, or the SVG would swallow disc taps.
      */}
      <Svg width={board.width} height={height} style={styles.trail} pointerEvents="none">
        <Path
          d={d}
          stroke={color.surfaceLocked}
          strokeWidth={board.trailWidth}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={d}
          stroke={color.surfaceCard}
          strokeWidth={board.trailDotWidth}
          strokeLinecap="round"
          strokeDasharray="2 14"
          fill="none"
        />
        <AnimatedPath
          d={d}
          stroke={color.progress}
          strokeWidth={board.trailWidth}
          strokeLinecap="round"
          fill="none"
          /*
            Dashed with the trail's own measured length, in user units.

            `pathLength` would let these be percentages, but it is not in this
            version of react-native-svg's PathProps and would be dropped. A
            fixed guess does not work either: it was tried at 4000, far longer
            than any real board, and the single dash then covered the whole
            path no matter the offset - the trail was green to the bottom.
          */
          strokeDasharray={total}
          animatedProps={trailProps}
        />
      </Svg>

      {items.map((item) => {
        if (item.kind === 'gate') {
          const capstone = capstoneOf(techniques, item.stage);
          const remaining = Math.max(item.index - doneCount, 0);

          return (
            <View key={`gate-${item.stage}`} style={[styles.placed, { left: item.x, top: item.y }]}>
              <PathGate
                open={doneCount >= item.index}
                title={capstone?.title ?? `Stage ${item.stage}`}
                remaining={remaining}
              />
            </View>
          );
        }

        if (item.kind === 'finish') {
          return (
            <View key="finish" style={[styles.placed, { left: item.x, top: item.y }]}>
              <View style={styles.finish}>
                <View style={styles.finishDisc}>
                  <Star size={20} color={color.iconDecorative} strokeWidth={2.2} />
                </View>
                <Text variant="caption" tone="textSecondary" center numberOfLines={3}>
                  {goal}
                </Text>
              </View>
            </View>
          );
        }

        const technique = techniques[item.index];
        const status = statusOf(technique.status);
        const isRight = item.x > board.width / 2;
        // Only the disc that just became reachable plays the entrance, and
        // only while an unlock is actually running.
        const arriving = item.index === activeIndex && !reduceMotion;

        return (
          <View key={technique.id} style={[styles.placed, { left: item.x, top: item.y }]}>
            <Animated.View style={arriving ? entranceStyle : undefined}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Level ${item.index + 1}, ${technique.title}`}
                onPress={() => onSelect(technique.id)}
                style={styles.discWrap}
              >
                {/* The page-coloured ring is what makes the trail read as
                    passing behind the disc rather than through it. */}
                <View style={styles.outline}>
                  <PathNode
                    status={status}
                    size={board.nodeSize}
                    mastery={status === 'active' ? masteryOf(technique) : undefined}
                    testID={`node-${technique.id}`}
                  />
                </View>
                <View style={[styles.levelBadge, { borderColor: badgeBorder(status) }]}>
                  <Text variant="overline" style={styles.levelText}>
                    {item.index + 1}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>

            <View
              style={[
                styles.labels,
                isRight
                  ? { right: board.labelOffset, alignItems: 'flex-end' }
                  : { left: board.labelOffset, alignItems: 'flex-start' },
              ]}
              pointerEvents="none"
            >
              <Text
                variant="label"
                numberOfLines={2}
                style={{ color: labelInk(status), textAlign: isRight ? 'right' : 'left' }}
              >
                {technique.title}
              </Text>
              <Text variant="caption" style={{ color: metaInk(status) }}>
                {metaFor(technique)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

/** `skipped` has no board colour of its own; it reads as unwalked. */
function statusOf(status: Technique['status']): PathNodeStatus {
  if (status === 'completed') return 'completed';
  if (status === 'active') return 'active';

  return 'locked';
}

function badgeBorder(status: PathNodeStatus): string {
  if (status === 'completed') return color.progress;
  if (status === 'active') return color.brand;

  return color.borderStrong;
}

function labelInk(status: PathNodeStatus): string {
  if (status === 'active') return color.brand;
  if (status === 'completed') return color.progressText;

  return color.textSecondary;
}

function metaInk(status: PathNodeStatus): string {
  return status === 'active' ? color.brand : color.textSecondary;
}

function metaFor(technique: Technique): string {
  if (technique.status === 'active') return 'You are here';
  if (technique.status === 'completed') return 'Mastered';
  if (technique.status === 'skipped') return 'Not for me';

  return `${technique.estimatedMinutes} min`;
}

const styles = StyleSheet.create({
  board: { width: board.width, alignSelf: 'center' },
  trail: { position: 'absolute', left: 0, top: 0 },
  placed: { position: 'absolute' },
  discWrap: {
    width: board.nodeSize,
    height: board.nodeSize,
    marginLeft: -board.nodeSize / 2,
    marginTop: -board.nodeSize / 2,
  },
  outline: {
    borderRadius: board.nodeSize / 2,
    borderWidth: board.discOutline,
    borderColor: color.surfacePage,
  },
  levelBadge: {
    position: 'absolute',
    right: -8,
    top: -8,
    minWidth: 23,
    height: 23,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    borderWidth: 2,
    backgroundColor: color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: { color: color.textPrimary, letterSpacing: 0 },
  labels: { position: 'absolute', top: -10, width: board.labelWidth, gap: 3 },
  finish: { alignItems: 'center', gap: 8, width: 250, marginLeft: -125, marginTop: -28 },
  finishDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
