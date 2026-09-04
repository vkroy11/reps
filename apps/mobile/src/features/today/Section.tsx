import { Text, space } from '@reps/ui';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export interface SectionProps {
  title: string;
  /** A figure on the right of the heading - a total, a count, a ratio. */
  meta?: string | null;
  /**
   * Set for sections whose content scrolls sideways to the screen edge, so the
   * heading keeps its gutter while the shelf below it does not.
   */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * One labelled block on Today.
 *
 * The whole screen is a stack of these, so the rhythm between a heading and
 * its content is set once. A section renders nothing when it has no children,
 * which is how a block with no data behind it disappears rather than sitting
 * empty with a heading over it.
 */
export function Section({ title, meta, bleed = false, style, children }: SectionProps) {
  if (children === null || children === false || children === undefined) return null;

  return (
    <View style={[styles.section, !bleed && styles.gutter, style]}>
      <View style={[styles.heading, bleed && styles.gutter]}>
        <Text variant="label" style={styles.title}>
          {title}
        </Text>
        {meta ? (
          <Text variant="caption" tone="textSecondary">
            {meta}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.lg },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    marginBottom: space.md,
  },
  gutter: { paddingHorizontal: space.base },
  title: { flex: 1, minWidth: 0 },
});
