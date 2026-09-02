import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useReduceMotion } from './hooks/useReduceMotion';
import { springConfig } from './tokens';

export type PipExpression = 'idle' | 'think' | 'cheer' | 'struggle';

export interface PipLogoProps {
  size?: number;
  expression?: PipExpression;
  /** Idle breathing. Off for static contexts like a list row. */
  animate?: boolean;
  onPress?: () => void;
  testID?: string;
}

const BRAND = '#2563EB';
const HIGHLIGHT = '#60A5FA';
const BROW = '#93C5FD';
const WHITE = '#FFFFFF';
const INK = '#0F172A';

/**
 * Pip, the logo mark.
 *
 * Deliberately has **no progress ring**. The ring means real progress
 * elsewhere in the app (path nodes, the practice timer, mastery), so a
 * constant mark must never wear one - it would be claiming progress that does
 * not exist.
 *
 * Drawn on a 96 grid and scaled, so one component serves the 20px tab icon and
 * the 128px welcome hero.
 */
export function PipLogo({
  size = 32,
  expression = 'idle',
  animate = true,
  onPress,
  testID,
}: PipLogoProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    // Only idle breathes; the other expressions are momentary states.
    if (!animate || reduceMotion || expression !== 'idle') {
      scale.value = withTiming(1, { duration: 0 });

      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [animate, expression, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const body = (
    <Animated.View style={animatedStyle}>
      <Svg width={size} height={size} viewBox="0 0 96 96" testID={testID}>
        <Rect x={8} y={8} width={80} height={80} rx={30} fill={BRAND} />
        <Path
          d="M22 32a20 20 0 0 1 20-14"
          stroke={HIGHLIGHT}
          strokeWidth={5.5}
          strokeLinecap="round"
          fill="none"
        />
        <Face expression={expression} />
      </Svg>
    </Animated.View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Reps"
      onPress={onPress}
      onPressIn={() => {
        scale.value = reduceMotion
          ? withTiming(1, { duration: 0 })
          : withSpring(0.92, springConfig.press);
      }}
      onPressOut={() => {
        scale.value = reduceMotion
          ? withTiming(1, { duration: 0 })
          : withSpring(1, springConfig.pop);
      }}
    >
      {body}
    </Pressable>
  );
}

/** Expression is a swap of eye and mouth geometry, never a change of silhouette. */
function Face({ expression }: { expression: PipExpression }) {
  if (expression === 'cheer') {
    return (
      <>
        <Path
          d="M28 44q7-7 14 0M54 44q7-7 14 0"
          stroke={WHITE}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M36 58q12 12 24 0z" fill={WHITE} />
      </>
    );
  }

  const pupilY = expression === 'think' ? 41.5 : 45.5;

  return (
    <>
      {expression === 'struggle' && (
        <Path
          d="M27 34q8-6 16-1M53 33q8-5 16 2"
          stroke={BROW}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      )}
      <Circle cx={35} cy={44} r={7} fill={WHITE} />
      <Circle cx={61} cy={44} r={7} fill={WHITE} />
      <Circle cx={36.5} cy={pupilY} r={3.4} fill={INK} />
      <Circle cx={62.5} cy={pupilY} r={3.4} fill={INK} />
      {expression === 'idle' && (
        <Path d="M38 62q10 7 20 0" stroke={WHITE} strokeWidth={5} strokeLinecap="round" fill="none" />
      )}
      {expression === 'think' && (
        <Path d="M42 62h12" stroke={WHITE} strokeWidth={5} strokeLinecap="round" fill="none" />
      )}
      {expression === 'struggle' && (
        <Path
          d="M39 63q4-4 7 0t7 0"
          stroke={WHITE}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </>
  );
}
