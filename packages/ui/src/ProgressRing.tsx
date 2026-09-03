import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { useReduceMotion } from './hooks/useReduceMotion';
import { motion } from './motion';
import { color } from './tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0 to 1. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** The arc. Defaults to brand; panels pass their own accent. */
  tint?: string;
  /** The groove behind the arc. */
  track?: string;
  /** Rendered in the middle. A step counter, usually. */
  label?: string;
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A ring that fills clockwise from twelve o'clock.
 *
 * Animated through `strokeDashoffset` on a `pathLength` of 100, so the value is
 * already a percentage and the arc length never has to be recomputed from the
 * radius. Nothing here touches layout, so it runs on the UI thread.
 */
export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  tint = color.brand,
  track = color.surfaceLocked,
  label,
  labelColor = color.textPrimary,
  style,
}: ProgressRingProps) {
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(100 - clamp(value) * 100);

  useEffect(() => {
    const target = 100 - clamp(value) * 100;
    offset.value = reduceMotion ? target : withTiming(target, motion.ring);
  }, [value, offset, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  // The stroke is centred on the radius, so it must be inset by half its width
  // or the ring is clipped by the viewBox.
  const radius = (size - strokeWidth) / 2;
  const centre = size / 2;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(value) * 100) }}
      style={[styles.wrap, { width: size, height: size }, style]}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={tint}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          // pathLength normalises the circumference to 100 so the dash values
          // below are percentages regardless of size.
          pathLength={100}
          strokeDasharray="100"
          animatedProps={animatedProps}
          // Start at the top rather than at three o'clock.
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      </Svg>
      {label === undefined ? null : (
        <Text variant="caption" style={[styles.label, { color: labelColor }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', top: 0, left: 0 },
  label: { fontSize: 12, fontVariant: ['tabular-nums'] },
});
