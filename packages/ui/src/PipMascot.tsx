import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useReduceMotion } from './hooks/useReduceMotion';
import { color, springConfig } from './tokens';

export type MascotExpression = 'idle' | 'think' | 'cheer' | 'struggle';

export interface PipMascotProps {
  size?: number;
  expression?: MascotExpression;
  /**
   * 0-1. Draws the mastery ring. Omit it and no ring is drawn - the ring means
   * real progress, so it never appears decoratively.
   */
  progress?: number;
  testID?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Geometry constants for the 96-unit grid the mascot is drawn on. */
const RING_RADIUS = 41;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const EYE_LEFT_X = 39;
const EYE_RIGHT_X = 57;
const EYE_Y = 45;
/** How far a pupil may travel inside the white before it would clip the edge. */
const PUPIL_TRAVEL = 2.1;

const BRAND = '#2563EB';
const HIGHLIGHT = '#60A5FA';
const BROW = '#93C5FD';

/**
 * Pip with the mastery ring: the feedback form of the mascot, used on the
 * generating screen, the reflect celebration and the struggle intervention.
 *
 * The plain logo lives in PipLogo and never has a ring.
 *
 * Everything animated here is a transform, an opacity, or a numeric SVG
 * attribute driven through useAnimatedProps, so it all runs on the UI thread
 * and none of it triggers layout.
 */
export function PipMascot({
  size = 96,
  expression = 'idle',
  progress,
  testID,
}: PipMascotProps) {
  const reduceMotion = useReduceMotion();

  const breathe = useSharedValue(1);
  const arcRotation = useSharedValue(0);
  const gaze = useSharedValue(0);
  const blink = useSharedValue(1);
  const ring = useSharedValue(progress ?? 0);

  // Idle breathing.
  useEffect(() => {
    if (reduceMotion || expression !== 'idle') {
      breathe.value = withTiming(1, { duration: 0 });

      return;
    }

    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [breathe, expression, reduceMotion]);

  // The thinking arc sweeps continuously; rotation never triggers layout.
  useEffect(() => {
    if (reduceMotion || expression !== 'think') {
      arcRotation.value = 0;

      return;
    }

    arcRotation.value = withRepeat(
      withTiming(360, { duration: 1400, easing: Easing.linear }),
      -1,
    );
  }, [arcRotation, expression, reduceMotion]);

  /**
   * Pupils drift inside the eyeballs while thinking, which is what stops the
   * face reading as frozen during a 20-second wait. Held at centre otherwise.
   */
  useEffect(() => {
    if (reduceMotion || expression !== 'think') {
      gaze.value = withTiming(0, { duration: 200 });

      return;
    }

    gaze.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
    );
  }, [gaze, expression, reduceMotion]);

  // An occasional blink; cheap, and it keeps the character alive.
  useEffect(() => {
    if (reduceMotion || expression === 'cheer') {
      blink.value = 1;

      return;
    }

    blink.value = withRepeat(
      withSequence(
        withDelay(2600, withTiming(0.12, { duration: 90 })),
        withTiming(1, { duration: 110 }),
        withDelay(1400, withTiming(0.12, { duration: 90 })),
        withTiming(1, { duration: 110 }),
      ),
      -1,
    );
  }, [blink, expression, reduceMotion]);

  // Ring fills toward the reported progress and never rewinds on its own.
  useEffect(() => {
    if (progress === undefined) return;

    const clamped = Math.min(Math.max(progress, 0), 1);
    ring.value = reduceMotion
      ? withTiming(clamped, { duration: 0 })
      : withSpring(clamped, springConfig.press);
  }, [progress, ring, reduceMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const arcStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arcRotation.value}deg` }],
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - ring.value),
  }));

  const leftPupil = useAnimatedProps(() => ({
    cx: EYE_LEFT_X + gaze.value * PUPIL_TRAVEL,
  }));

  const rightPupil = useAnimatedProps(() => ({
    cx: EYE_RIGHT_X + gaze.value * PUPIL_TRAVEL,
  }));

  // Blinking squashes the eye whites rather than hiding them, so the lids read
  // as lids. Radius is a number, so it animates through useAnimatedProps too.
  const eyeRadius = useDerivedValue(() => 5 * blink.value);
  const leftEye = useAnimatedProps(() => ({ r: eyeRadius.value }));
  const rightEye = useAnimatedProps(() => ({ r: eyeRadius.value }));
  const pupilRadius = useDerivedValue(() => 2.4 * Math.max(blink.value, 0.2));
  const leftPupilSize = useAnimatedProps(() => ({ r: pupilRadius.value }));
  const rightPupilSize = useAnimatedProps(() => ({ r: pupilRadius.value }));

  const ringColor =
    expression === 'struggle' ? color.streak : expression === 'think' ? color.brand : color.progress;

  return (
    <Animated.View style={containerStyle} testID={testID}>
      <Svg width={size} height={size} viewBox="0 0 96 96">
        {progress !== undefined ? (
          <>
            <Circle
              cx={48}
              cy={48}
              r={RING_RADIUS}
              stroke={color.surfaceLocked}
              strokeWidth={6}
              fill="none"
            />
            <AnimatedCircle
              cx={48}
              cy={48}
              r={RING_RADIUS}
              stroke={ringColor}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_CIRCUMFERENCE}
              transform="rotate(-90 48 48)"
              animatedProps={ringProps}
            />
          </>
        ) : null}

        <Rect x={20} y={20} width={56} height={56} rx={22} fill={BRAND} />
        <Path
          d="M30 34a14 14 0 0 1 14-10"
          stroke={HIGHLIGHT}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />

        {expression === 'cheer' ? (
          <>
            <Path
              d="M34 45q5-5 10 0M52 45q5-5 10 0"
              stroke="#FFFFFF"
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path d="M39 57q9 9 18 0z" fill="#FFFFFF" />
          </>
        ) : (
          <>
            {expression === 'struggle' ? (
              <Path
                d="M31 36q6-5 12-1M53 35q6-4 12 1"
                stroke={BROW}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            ) : null}
            <AnimatedCircle cx={EYE_LEFT_X} cy={EYE_Y} fill="#FFFFFF" animatedProps={leftEye} />
            <AnimatedCircle cx={EYE_RIGHT_X} cy={EYE_Y} fill="#FFFFFF" animatedProps={rightEye} />
            <AnimatedCircle
              cy={EYE_Y + 1}
              fill={color.textPrimary}
              animatedProps={{ ...leftPupil, ...leftPupilSize }}
            />
            <AnimatedCircle
              cy={EYE_Y + 1}
              fill={color.textPrimary}
              animatedProps={{ ...rightPupil, ...rightPupilSize }}
            />
            <Path
              d={MOUTHS[expression]}
              stroke="#FFFFFF"
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
      </Svg>

      {/* The sweeping arc sits above the face so it reads as motion around Pip. */}
      {expression === 'think' ? (
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, arcStyle]}>
          <Svg width={size} height={size} viewBox="0 0 96 96">
            <Circle
              cx={48}
              cy={48}
              r={RING_RADIUS}
              stroke={color.brand}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE * 0.22} ${RING_CIRCUMFERENCE}`}
              transform="rotate(-90 48 48)"
            />
          </Svg>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const MOUTHS: Record<Exclude<MascotExpression, 'cheer'>, string> = {
  idle: 'M42 59q6 5 12 0',
  think: 'M43 59h10',
  struggle: 'M42 60q3-3 6 0t6 0',
};
