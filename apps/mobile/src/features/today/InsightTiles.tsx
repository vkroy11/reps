import { Text, color, radius, space } from '@reps/ui';
import Bolt from 'lucide-react-native/icons/zap';
import Flame from 'lucide-react-native/icons/flame';
import Plus from 'lucide-react-native/icons/plus';
import Star from 'lucide-react-native/icons/star';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export interface InsightTilesProps {
  /** 0-1 on the technique in hand. */
  mastery: number;
  streak: number;
  longestStreak: number;
  xp: number;
  onLogPractice: () => void;
  onOpenTechnique: () => void;
  onOpenProfile: () => void;
}

type Tile = {
  key: string;
  head: string;
  value: string;
  foot: string;
  Icon: typeof Star;
  accent: string;
  onPress: () => void;
};

/**
 * Four numbers about today, in a row that scrolls sideways.
 *
 * Sideways rather than a 2x2 grid: the first tile is an action, not a
 * statistic, and a grid would give it the same weight as the three readings
 * beside it. In a row it is simply first, and it keeps its highlighted header
 * while the rest read as instrument dials.
 *
 * "Log practice" is here because practice happens away from the phone. A
 * learner who ran their scales in the car and cannot record it learns that the
 * app's numbers are not about them.
 */
export function InsightTiles({
  mastery,
  streak,
  longestStreak,
  xp,
  onLogPractice,
  onOpenTechnique,
  onOpenProfile,
}: InsightTilesProps) {
  const tiles: Tile[] = [
    {
      key: 'log',
      head: 'Log practice',
      value: 'Add a rep',
      foot: 'Off-plan work counts',
      Icon: Plus,
      accent: color.brand,
      onPress: onLogPractice,
    },
    {
      key: 'mastery',
      head: 'Mastery',
      value: `${Math.round(mastery * 100)}%`,
      foot: 'On this level',
      Icon: Star,
      accent: color.progressText,
      onPress: onOpenTechnique,
    },
    {
      key: 'streak',
      head: 'Streak',
      value: `${streak} ${streak === 1 ? 'day' : 'days'}`,
      // The best run is only worth showing once it beats the current one -
      // otherwise it reads as "you are past your peak".
      foot: longestStreak > streak ? `Best was ${longestStreak}` : 'Your best run',
      Icon: Flame,
      accent: color.streakText,
      onPress: onOpenProfile,
    },
    {
      key: 'xp',
      head: 'XP',
      value: `${xp}`,
      foot: 'From minutes practised',
      Icon: Bolt,
      accent: color.brand,
      onPress: onOpenProfile,
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.shelf}
    >
      {tiles.map((tile, index) => (
        <Pressable
          key={tile.key}
          accessibilityRole="button"
          accessibilityLabel={`${tile.head}: ${tile.value}. ${tile.foot}`}
          onPress={tile.onPress}
          style={styles.tile}
          testID={`insight-${tile.key}`}
        >
          <View style={[styles.head, index === 0 && styles.headLead]}>
            <Text variant="caption" style={index === 0 ? styles.headLeadInk : styles.headInk}>
              {tile.head}
            </Text>
          </View>
          <View style={styles.body}>
            <View style={styles.glyph}>
              <tile.Icon size={19} color={tile.accent} strokeWidth={2.4} />
            </View>
            <Text variant="heading" style={styles.value}>
              {tile.value}
            </Text>
            <Text variant="overline" tone="textSecondary" style={styles.foot}>
              {tile.foot}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: space.md, paddingHorizontal: space.base, paddingBottom: space.xs },
  tile: {
    width: 136,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.surfaceCard,
    overflow: 'hidden',
  },
  head: {
    paddingVertical: space.sm + 1,
    paddingHorizontal: space.md,
    backgroundColor: color.surfaceSunken,
  },
  headLead: { backgroundColor: color.brandSoft },
  headInk: { color: color.textSecondary },
  /* brandPressed on brandSoft measures 6.05; brand on it is 4.5 exactly. */
  headLeadInk: { color: color.brandPressed },
  body: { padding: space.md, paddingTop: space.md - 1 },
  glyph: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm - 1,
  },
  value: { fontVariant: ['tabular-nums'] },
  foot: { marginTop: 2, letterSpacing: 0.4 },
});
