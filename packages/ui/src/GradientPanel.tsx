import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface GradientPanelProps {
  /** Colour at the top edge. */
  from: string;
  /** Colour at the bottom edge - usually the page, so the panel dissolves. */
  to: string;
  /**
   * Rounding on the bottom two corners only, which is what gives the panel its
   * skirt. The top corners stay square because it runs to the screen edges.
   */
  bottomRadius?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * A vertical two-stop gradient behind its children.
 *
 * **Why react-native-svg and not expo-linear-gradient.** The latter is a native
 * module, so adding it would mean a new development build for one decorative
 * fill. `react-native-svg` is already here for the path board and the progress
 * rings, and a gradient-filled rect is the same thing on every platform.
 *
 * **Why the corners are clipped rather than drawn.** Rounding only the bottom
 * two corners of a rect needs a path, and a path needs the panel's measured
 * height - which arrives a frame late and would flash. Clipping with the
 * container's own border radii needs no measurement, so the gradient is
 * correct on the first frame.
 */
export function GradientPanel({ from, to, bottomRadius = 0, style, children }: GradientPanelProps) {
  // Gradient ids share one document on web, so two panels with the same id
  // would resolve to whichever mounted last.
  const gradientId = `panel-gradient-${useId()}`;

  return (
    <View
      style={[
        styles.panel,
        { borderBottomLeftRadius: bottomRadius, borderBottomRightRadius: bottomRadius },
        style,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Clips the gradient to the rounded bottom edge. */
  panel: { overflow: 'hidden' },
});
