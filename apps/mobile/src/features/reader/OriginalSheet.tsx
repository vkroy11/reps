import { ActionSheet, Button, Text, color, radius, space } from '@reps/ui';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface OriginalSheetProps {
  url: string | null;
  title: string;
  onClose: () => void;
}

/**
 * The live page, still inside Reps.
 *
 * The native reader is the default. This exists so the learner can check the
 * original without being dumped into Safari — and so a failed extraction is
 * not a dead end.
 */
export function OriginalSheet({ url, title, onClose }: OriginalSheetProps) {
  const openOutside = () => {
    if (url) void Linking.openURL(url);
  };

  return (
    <ActionSheet visible={url !== null} onClose={onClose} accessibilityLabel="Original article">
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" tone="textSecondary" numberOfLines={1}>
          {url}
        </Text>

        {url && Platform.OS !== 'web' ? (
          <View style={styles.frame}>
            <WebView source={{ uri: url }} startInLoadingState style={styles.web} />
          </View>
        ) : null}

        <Button label="Open in browser" variant="secondary" onPress={openOutside} />
        <Button label="Close" variant="ghost" onPress={onClose} />
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.lg },
  frame: {
    height: 420,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: color.surfaceLocked,
  },
  web: { flex: 1 },
});
