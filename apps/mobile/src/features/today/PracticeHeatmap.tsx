import type { HeatLevel, Heatmap } from '@reps/core';
import { Card, Text, color, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';

/**
 * The ramp, from a day with nothing on it to the day a level fell.
 *
 * Four steps, and the top one is brand rather than a darker lime: clearing a
 * level is a different kind of event from practising hard, so it gets a
 * different hue instead of one more shade of the same one.
 */
const FILL: Record<HeatLevel, string> = {
  0: color.surfaceLocked,
  1: color.progressSoft,
  2: color.progress,
  3: color.brand,
};

const ROWS = 7;
const CELL = 14;
const CELL_GAP = 3;
/** Half a year. Past this the squares stop meaning anything individually. */
const MAX_WEEKS = 26;
/** Columns a month needs before its label fits over them. */
const MIN_LABEL_COLUMNS = 2;

/**
 * How many weeks fit in the space available, so the grid fills its card.
 *
 * The alternative was fixing the number of weeks and stretching the cells,
 * which stops them being square, or fixing both and leaving a third of the
 * card empty on a phone. Sizing the *window* to the device is the one option
 * that keeps a square square.
 */
export function weeksThatFit(availableWidth: number): number {
  const columns = Math.floor((availableWidth + CELL_GAP) / (CELL + CELL_GAP));

  return Math.max(4, Math.min(columns, MAX_WEEKS));
}

export interface PracticeHeatmapProps {
  grid: Heatmap;
}

/**
 * Every day of the path so far, one square each.
 *
 * Weeks run down the columns, Monday at the top, which is the convention any
 * learner who has seen a contribution graph already reads without a legend.
 *
 * The squares are laid out by flex-wrapping a fixed-height column rather than
 * with a grid: React Native has no grid, and `flexWrap` on a container whose
 * height is exactly seven rows fills column by column, which is the order
 * `heatmap()` already returns.
 */
export function PracticeHeatmap({ grid }: PracticeHeatmapProps) {
  return (
    <Card>
      {grid.months.length > 1 ? (
        <View style={styles.months}>
          {grid.months.map((month, index) => (
            <Text
              key={`${month.label}-${index}`}
              variant="overline"
              tone="textSecondary"
              numberOfLines={1}
              style={{ flex: month.columns }}
            >
              {/*
                A month that owns one 14pt column has no room for a three-letter
                label, and printing it anyway makes it collide with the next
                one - "MAYJUN". The run is still visible in the squares; only
                its name is dropped.
              */}
              {month.columns < MIN_LABEL_COLUMNS ? '' : month.label}
            </Text>
          ))}
        </View>
      ) : null}

      <View
        style={styles.grid}
        accessibilityLabel={`${grid.weeks} weeks, ${grid.daysPractised} days practised across ${grid.sessions} sessions`}
      >
        {grid.cells.map((cell) => (
          <View
            key={cell.day}
            style={[
              styles.cell,
              // A day that has not happened is a hole, not a rest day: an empty
              // square would read as a miss the learner has not had a chance
              // to avoid yet.
              cell.isFuture ? styles.future : { backgroundColor: FILL[cell.level] },
              cell.isToday && styles.today,
            ]}
          />
        ))}
      </View>

      <View style={styles.legend}>
        <Text variant="overline" tone="textSecondary">
          REST
        </Text>
        {([0, 1, 2, 3] as HeatLevel[]).map((level) => (
          <View key={level} style={[styles.key, { backgroundColor: FILL[level] }]} />
        ))}
        <Text variant="overline" tone="textSecondary">
          LEVEL CLEARED
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  months: { flexDirection: 'row', marginBottom: space.sm - 1 },
  /*
    Height is what forces the wrap into seven rows. It has to be exact: one
    point too few and every column spills an eighth cell into the next.
  */
  grid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    height: ROWS * CELL + (ROWS - 1) * CELL_GAP,
    gap: CELL_GAP,
  },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  future: { backgroundColor: 'transparent' },
  today: { borderWidth: 1.5, borderColor: color.brandPressed },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: space.md },
  key: { width: 11, height: 11, borderRadius: 3 },
});
