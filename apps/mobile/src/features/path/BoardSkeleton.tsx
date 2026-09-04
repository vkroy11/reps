import { Skeleton, board, color, layoutBoard, trailPath } from '@reps/ui';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Enough discs to show the serpentine turn over and place one gate. */
const PLACEHOLDER_TECHNIQUES = 4;
const GATE_EVERY = 3;

/**
 * The board's own shape, waiting for data.
 *
 * Built from `layoutBoard` and `trailPath` rather than a stack of rectangles,
 * so the discs and the trail sit exactly where the real ones will. A generic
 * list-shaped skeleton was what this screen showed before, left over from the
 * vertical spine - it promised a layout the board then replaced, which is a
 * jump on every load rather than a reveal.
 *
 * The trail is drawn flat in `surfaceLocked` with no progress fill: how far
 * along the path you are is precisely what is not known yet, and a shimmering
 * green trail would be inventing it.
 */
export function BoardSkeleton() {
  const { items, centres, height } = layoutBoard(PLACEHOLDER_TECHNIQUES, GATE_EVERY);
  const { d } = trailPath(centres);

  return (
    <View style={[styles.board, { height }]} accessibilityLabel="Loading your path">
      <Svg width={board.width} height={height} style={styles.trail} pointerEvents="none">
        <Path
          d={d}
          stroke={color.surfaceLocked}
          strokeWidth={board.trailWidth}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {items.map((item, index) => {
        if (item.kind === 'finish') return null;

        if (item.kind === 'gate') {
          return (
            <View key={`gate-${item.stage}`} style={[styles.placed, { left: item.x, top: item.y }]}>
              <View style={styles.gate}>
                <Skeleton height={60} borderRadius={16} delay={index * 70} />
              </View>
            </View>
          );
        }

        const isRight = item.x > board.width / 2;

        return (
          <View key={`node-${item.index}`} style={[styles.placed, { left: item.x, top: item.y }]}>
            <View style={styles.disc}>
              <Skeleton
                height={board.nodeSize}
                borderRadius={board.nodeSize / 2}
                delay={index * 70}
              />
            </View>
            <View
              style={[
                styles.labels,
                isRight ? { right: board.labelOffset } : { left: board.labelOffset },
              ]}
            >
              <Skeleton height={14} width="90%" borderRadius={7} delay={index * 70 + 40} />
              <Skeleton height={11} width="55%" borderRadius={6} delay={index * 70 + 80} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { width: board.width, alignSelf: 'center' },
  trail: { position: 'absolute', left: 0, top: 0 },
  placed: { position: 'absolute' },
  disc: {
    width: board.nodeSize,
    height: board.nodeSize,
    marginLeft: -board.nodeSize / 2,
    marginTop: -board.nodeSize / 2,
  },
  gate: { width: board.gateWidth, marginLeft: -board.gateWidth / 2, marginTop: -32 },
  labels: { position: 'absolute', top: -10, width: board.labelWidth, gap: 5 },
});
