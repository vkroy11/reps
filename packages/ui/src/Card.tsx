import { StyleSheet, View, type ViewProps } from 'react-native';
import { color, radius, space } from './tokens';

export type CardTone = 'default' | 'progress' | 'brand';

export interface CardProps extends ViewProps {
  tone?: CardTone;
  /** Removes inner padding when the card holds a full-bleed child, e.g. a video. */
  flush?: boolean;
}

const TONES: Record<CardTone, { backgroundColor: string; borderColor: string }> = {
  default: { backgroundColor: color.surfaceCard, borderColor: color.borderDefault },
  progress: { backgroundColor: color.progressSoft, borderColor: '#D9F99D' },
  brand: { backgroundColor: color.brandSoft, borderColor: color.brand },
};

export function Card({ tone = 'default', flush = false, style, ...rest }: CardProps) {
  return <View style={[styles.card, TONES[tone], flush && styles.flush, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, padding: space.base },
  flush: { padding: 0, overflow: 'hidden' },
});
