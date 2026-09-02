import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { color, typeScale, type ColorToken, type TypeVariant } from './tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: ColorToken;
  /** Overline is the only variant that is uppercased, and it is done here. */
  center?: boolean;
}

/**
 * The only text component in the app. Screens never set fontSize, fontFamily
 * or a raw colour, which is what keeps the type scale and the contrast
 * guarantees from drifting one screen at a time.
 */
export function Text({
  variant = 'body',
  tone = 'textPrimary',
  center = false,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        typeScale[variant],
        { color: color[tone] },
        variant === 'overline' && styles.overline,
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  overline: { textTransform: 'uppercase' },
  center: { textAlign: 'center' },
});
