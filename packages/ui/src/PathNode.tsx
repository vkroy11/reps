import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, duration, springConfig } from './tokens';

export type PathNodeStatus = 'completed' | 'active' | 'locked' | 'skipped';

export interface PathNodeProps {
  status: PathNodeStatus;
  size?: number;
  /** 0-1 mastery for this technique. Only drawn when it is partway through. */
  mastery?: number;
  onPress?: () => void;
  label?: string;
  testID?: string;
}

const PULSE_PERIOD = 1600;

/**
 * A node on the path spine.
 *
 * The current node pulses a halo so "you are here" reads without a caption.
 * The pulse animates scale and opacity on an overlay ring, never the node's
 * own size, so nothing around it reflows. A partial mastery ring is drawn only
 * when there is real progress to show - a full ring on every node would make
 * the colour meaningless.
 */
export function PathNode({
  status,
  size = 54,
  mastery,
  onPress,
  label,
  testID,
}: PathNodeProps) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || status !== 'active') {
      pulse.value = 0;

      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PULSE_PERIOD * 0.7, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: PULSE_PERIOD * 0.3 }),
      ),
      -1,
    );
  }, [pulse, status, reduceMotion]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  const fill =
    status === 'completed'
      ? color.progress
      : status === 'active'
        ? color.brand
        : color.surfaceLocked;

  const showMastery =
    mastery !== undefined && mastery > 0 && mastery < 1 && status !== 'completed';
  const radius = size / 2;
  const ringRadius = radius - 3;
  const circumference = 2 * Math.PI * ringRadius;

  const node = (
    <Animated.View style={[{ width: size, height: size }, pressStyle]}>
      {status === 'active' && !reduceMotion ? (
        <Animated.View style={[styles.halo, { borderRadius: radius }, haloStyle]} />
      ) : null}

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} testID={testID}>
        <Circle cx={radius} cy={radius} r={radius - (status === 'active' ? 4 : 3)} fill={fill} />

        {showMastery ? (
          <>
            <Circle
              cx={radius}
              cy={radius}
              r={ringRadius}
              stroke={color.surfaceLocked}
              strokeWidth={3}
              fill="none"
            />
            <Circle
              cx={radius}
              cy={radius}
              r={ringRadius}
              stroke={color.progress}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - mastery)}
              transform={`rotate(-90 ${radius} ${radius})`}
            />
          </>
        ) : null}

        <Glyph status={status} size={size} />
      </Svg>
    </Animated.View>
  );

  if (!onPress) return node;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: false }}
      onPress={onPress}
      onPressIn={() => {
        press.value = reduceMotion
          ? withTiming(1, { duration: 0 })
          : withSpring(0.93, springConfig.press);
      }}
      onPressOut={() => {
        press.value = reduceMotion
          ? withTiming(1, { duration: 0 })
          : withSpring(1, springConfig.press);
      }}
    >
      {node}
    </Pressable>
  );
}

function Glyph({ status, size }: { status: PathNodeStatus; size: number }) {
  // Glyphs are authored on a 54 grid and scaled with the node.
  const s = size / 54;
  const p = (value: number) => value * s;

  if (status === 'completed') {
    return (
      <Path
        d={`M${p(17)} ${p(27.5)}l${p(6.5)} ${p(6.5)}L${p(38)} ${p(20)}`}
        stroke="#FFFFFF"
        strokeWidth={4 * s}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  }

  if (status === 'active') {
    return <Path d={`M${p(22)} ${p(18)}v${p(18)}l${p(14)} ${p(-9)}z`} fill="#FFFFFF" />;
  }

  if (status === 'locked') {
    return (
      <Path
        d={`M${p(20)} ${p(26)}h${p(14)}v${p(10)}H${p(20)}zM${p(23)} ${p(26)}v${p(-4)}a${p(4)} ${p(4)} 0 0 1 ${p(8)} 0v${p(4)}`}
        stroke={color.iconDecorative}
        strokeWidth={2.4 * s}
        strokeLinejoin="round"
        fill="none"
      />
    );
  }

  return (
    <Path
      d={`M${p(19)} ${p(19)}l${p(16)} ${p(16)}M${p(35)} ${p(19)}L${p(19)} ${p(35)}`}
      stroke={color.iconDecorative}
      strokeWidth={3 * s}
      strokeLinecap="round"
    />
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: color.brand,
  },
});

/** Exposed so screens can match the spine's timing when they animate around it. */
export const pathNodePulsePeriod = duration.slow;
