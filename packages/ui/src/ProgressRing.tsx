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
 * Driven by `strokeDashoffset`, which is a paint property: nothing here runs
 * layout, so the fill animates on the UI thread.
 *
 * The dash values are in user units rather than the percentages `pathLength`
 * would allow, because `pathLength` is not in this version of
 * react-native-svg's `CircleProps` - it typechecks as an unknown prop and would
 * be silently dropped at runtime, leaving a ring that never moves.
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

  // The stroke straddles the radius, so it must be inset by half its width or
  // the ring is clipped by the viewBox.
  const radius = (size - strokeWidth) / 2;
  const centre = size / 2;
  const circumference = 2 * Math.PI * radius;

  const offset = useSharedValue(circumference * (1 - clamp(value)));

  useEffect(() => {
    const target = circumference * (1 - clamp(value));
    offset.value = reduceMotion ? target : withTiming(target, motion.ring);
  }, [value, circumference, offset, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(value) * 100) }}
      style={[styles.wrap, { width: size, height: size }, style]}
    >
      {/*
        The whole canvas is turned a quarter rather than the arc: a `transform`
        string is not among react-native-svg's animated Circle props, and the
        track is a full circle, so rotating it changes nothing.
      */}
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
          strokeDasharray={circumference}
          animatedProps={animatedProps}
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
  // Start the arc at twelve o'clock rather than three.
  svg: { position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] },
  label: { fontSize: 12, fontVariant: ['tabular-nums'] },
});
