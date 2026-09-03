import { Button, PipMascot, Text, panels, radius, space, type PanelKey } from '@reps/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Breathe } from './Breathe';

export interface CheerInterstitialProps {
  /** Which step's panel this inherits, so the colour carries from the answer. */
  panelKey: PanelKey;
  kicker: string;
  title: string;
  body: string;
  /** Exactly two. Three or more and it stops being reassurance and reads as marketing. */
  facts: readonly [string, string];
  ctaLabel: string;
  onContinue: () => void;
}

/**
 * A beat between questions: Pip reacts to the answer just given and reframes it.
 *
 * These carry momentum through a five-question form, so each has to say
 * something specific about the answer behind it. A generic "Great choice!" is
 * strictly worse than no screen at all, because it costs a tap and teaches the
 * learner that the app's encouragement is noise.
 */
export function CheerInterstitial({
  panelKey,
  kicker,
  title,
  body,
  facts,
  ctaLabel,
  onContinue,
}: CheerInterstitialProps) {
  const insets = useSafeAreaInsets();
  const panel = panels[panelKey];

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: panel.bg, paddingTop: insets.top, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <View style={styles.centre}>
        <View style={styles.pipWrap}>
          <Breathe style={[styles.halo, { backgroundColor: panel.ghost }]} />
          <PipMascot size={116} expression="cheer" />
        </View>

        <Text variant="overline" style={[styles.kicker, { color: panel.ink2 }]}>
          {kicker}
        </Text>
        <Text variant="display" center style={[styles.title, { color: panel.ink }]}>
          {title}
        </Text>
        <Text variant="body" center style={[styles.body, { color: panel.ink2 }]}>
          {body}
        </Text>

        <View style={styles.facts}>
          {facts.map((fact) => (
            <View key={fact} style={[styles.fact, { backgroundColor: panel.tile }]}>
              <Text variant="caption" style={{ color: panel.ink2 }}>
                {fact}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label={ctaLabel}
          onPress={onContinue}
          variant={panel.onDark ? 'inverse' : 'primary'}
          testID="cheer-continue"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.lg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pipWrap: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.base,
  },
  halo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 75 },
  kicker: { marginTop: space.base },
  title: { fontSize: 29, lineHeight: 36, marginTop: space.sm, marginBottom: space.md },
  body: { maxWidth: 300 },
  facts: { flexDirection: 'row', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap', justifyContent: 'center' },
  fact: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.full },
  footer: { width: '100%', maxWidth: 640, alignSelf: 'center' },
});
