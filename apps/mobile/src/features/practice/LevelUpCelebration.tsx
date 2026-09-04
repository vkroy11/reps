import type { Badge } from '@reps/core';
import {
  Button,
  PipMascot,
  Text,
  color,
  radius,
  space,
  springConfig,
  standardEasing,
  useReduceMotion,
} from '@reps/ui';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export interface LevelUpCelebrationProps {
  techniqueTitle: string;
  xpGained: number;
  minutes: number;
  done: number;
  total: number;
  /** Set only when this completion closed a gate. */
  badge: Badge | null;
  /** Null when the path is finished. */
  nextTitle: string | null;
  onContinue: () => void;
}

const PARTICLES = 18;
const LIFE_MS = 900;
/** Entrance delays for the stacked cards, in order. */
const STAGGER = [100, 160, 220, 300, 360] as const;

/**
 * The one moment in the app that is allowed to be loud.
 *
 * Every particle reads the same shared value, so the whole burst is one
 * animation regardless of count - eighteen separate timings would be eighteen
 * chances to desynchronise. Under Reduce Motion the burst is skipped and the
 * cards appear in place: the information is identical, only the delivery drops.
 */
export function LevelUpCelebration({
  techniqueTitle,
  xpGained,
  minutes,
  done,
  total,
  badge,
  nextTitle,
  onContinue,
}: LevelUpCelebrationProps) {
  const reduceMotion = useReduceMotion();
  const burst = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      burst.value = 1;
      enter.value = 1;

      return;
    }

    burst.value = withTiming(1, { duration: LIFE_MS, easing: standardEasing });
    enter.value = withSpring(1, springConfig.pop);
  }, [burst, enter, reduceMotion]);

  const pipStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.6 + enter.value * 0.4 }],
  }));

  return (
    <View style={styles.overlay}>
      <View style={styles.burst}>
        {!reduceMotion
          ? Array.from({ length: PARTICLES }).map((_, index) => (
              <Particle key={index} progress={burst} index={index} />
            ))
          : null}

        <Animated.View style={pipStyle}>
          <PipMascot size={122} expression="cheer" />
        </Animated.View>
      </View>

      <Rise delay={STAGGER[0]} reduceMotion={reduceMotion}>
        <Text center style={styles.title}>
          Technique mastered
        </Text>
      </Rise>
      <Rise delay={STAGGER[1]} reduceMotion={reduceMotion}>
        <Text variant="label" center style={styles.subtitle} numberOfLines={2}>
          {techniqueTitle}
        </Text>
      </Rise>

      <Rise delay={STAGGER[2]} reduceMotion={reduceMotion} style={styles.stats}>
        <Stat value={`+${xpGained}`} label="XP" />
        <Stat value={`${done}/${total}`} label="Techniques" />
        <Stat value={`${minutes}`} label={minutes === 1 ? 'Minute' : 'Minutes'} />
      </Rise>

      {badge ? (
        <Rise delay={STAGGER[3]} reduceMotion={reduceMotion} style={styles.badge}>
          <Text variant="overline" style={styles.badgeKicker}>
            Gate cleared · badge earned
          </Text>
          <Text variant="heading" style={styles.badgeLabel} numberOfLines={2}>
            {badge.label}
          </Text>
        </Rise>
      ) : null}

      <Rise delay={STAGGER[4]} reduceMotion={reduceMotion} style={styles.footer}>
        <Text variant="caption" center style={styles.next} numberOfLines={2}>
          {nextTitle === null ? 'That was the last one.' : `Next up · ${nextTitle}`}
        </Text>
        <Button
          label={nextTitle === null ? 'See the path' : 'See it unlock'}
          onPress={onContinue}
          testID="celebration-continue"
        />
      </Rise>
    </View>
  );
}

/**
 * One piece of confetti.
 *
 * Position is a rotation plus a translateY, so the radial spread costs two
 * transforms rather than any trigonometry per frame.
 */
function Particle({ progress, index }: { progress: SharedValue<number>; index: number }) {
  const angle = (360 / PARTICLES) * index;
  const distance = 72 + (index % 5) * 11;
  const size = 7 + (index % 3) * 3;
  const square = index % 4 === 0;
  const tint = [color.brand, color.progress, color.streak, '#FFFFFF'][index % 4];

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { rotate: `${angle}deg` },
      { translateY: -distance * progress.value },
      { scale: 1 - progress.value * 0.7 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { width: size, height: size, borderRadius: square ? 2 : size / 2, backgroundColor: tint },
        style,
      ]}
    />
  );
}

function Rise({
  delay,
  reduceMotion,
  style,
  children,
}: {
  delay: number;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const value = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      value.value = 1;

      return;
    }

    value.value = withDelay(delay, withTiming(1, { duration: 400, easing: standardEasing }));
  }, [delay, reduceMotion, value]);

  const animated = useAnimatedStyle(() => ({
    opacity: value.value,
    transform: [{ translateY: (1 - value.value) * 14 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="overline" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,18,32,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    gap: space.sm,
  },
  burst: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  subtitle: { color: '#CBD5E1' },
  stats: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch', marginTop: space.sm },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.card,
    padding: 14,
    gap: 3,
  },
  statValue: { color: '#FFFFFF' },
  statLabel: { color: '#94A3B8' },
  badge: {
    alignSelf: 'stretch',
    marginTop: space.md,
    padding: space.base,
    borderRadius: radius.card,
    backgroundColor: color.brand,
    gap: 2,
  },
  badgeKicker: { color: 'rgba(255,255,255,0.8)' },
  badgeLabel: { color: color.textOnBrand },
  footer: { alignSelf: 'stretch', marginTop: space.base, gap: space.base },
  next: { color: '#CBD5E1' },
});
