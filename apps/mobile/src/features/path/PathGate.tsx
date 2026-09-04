import { Text, board, color, motion, radius, space, useReduceMotion } from '@reps/ui';
import Lock from 'lucide-react-native/icons/lock';
import Star from 'lucide-react-native/icons/star';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export interface PathGateProps {
  open: boolean;
  /** The stage's capstone technique - the same string the badge is named after. */
  title: string;
  /** How many techniques still stand between here and the gate. */
  remaining: number;
}

/**
 * A milestone every three techniques.
 *
 * Locked it is a dashed outline stating its condition; open it fills with brand
 * and breathes slowly, so a cleared gate is recognisable while scrolling past
 * at speed rather than something you have to stop and read.
 */
export function PathGate({ open, title, remaining }: PathGateProps) {
  const reduceMotion = useReduceMotion();
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!open || reduceMotion) {
      glow.value = 0;

      return;
    }

    glow.value = withRepeat(
      withTiming(1, {
        duration: motion.gateGlowPeriod / 2,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [glow, open, reduceMotion]);

  // An outline behind the card rather than the card's own size or shadow:
  // animating either would reflow or repaint everything beside it.
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.9,
    transform: [{ scale: 1 + glow.value * 0.04 }],
  }));

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={
        open
          ? `Gate cleared: ${title}`
          : `Locked gate: ${title}. ${remaining} ${remaining === 1 ? 'technique' : 'techniques'} to go.`
      }
    >
      {open ? <Animated.View style={[styles.glow, glowStyle]} /> : null}

      <View style={[styles.card, open ? styles.cardOpen : styles.cardLocked]}>
        <View style={[styles.icon, open ? styles.iconOpen : styles.iconLocked]}>
          {open ? (
            <Star size={18} color={color.textOnBrand} fill={color.textOnBrand} />
          ) : (
            <Lock size={18} color={color.iconDecorative} strokeWidth={2.2} />
          )}
        </View>

        <View style={styles.copy}>
          <Text
            variant="overline"
            style={{ color: open ? 'rgba(255,255,255,0.72)' : color.textSecondary }}
          >
            {open
              ? 'Gate cleared'
              : `${remaining} ${remaining === 1 ? 'technique' : 'techniques'} to go`}
          </Text>
          <Text
            variant="label"
            numberOfLines={2}
            style={{ color: open ? color.textOnBrand : color.textPrimary }}
          >
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: board.gateWidth, marginLeft: -board.gateWidth / 2, marginTop: -32 },
  glow: {
    position: 'absolute',
    left: -6,
    right: -6,
    top: -6,
    bottom: -6,
    borderRadius: radius.card + 6,
    backgroundColor: color.brandSoft,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 13,
    paddingHorizontal: space.base,
    borderRadius: radius.card,
    borderWidth: 2,
  },
  cardOpen: { backgroundColor: color.brand, borderColor: color.brand },
  cardLocked: {
    backgroundColor: color.surfaceCard,
    borderColor: color.borderStrong,
    borderStyle: 'dashed',
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOpen: { backgroundColor: 'rgba(255,255,255,0.22)' },
  iconLocked: { backgroundColor: color.surfacePage },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
