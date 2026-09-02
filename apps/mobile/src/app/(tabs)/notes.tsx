import { PipLogo, Text, color, space } from '@reps/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Notes land in Phase 6, alongside the video player - a note is only useful
 * once there is something to take it against. Until then this is an honest
 * empty state rather than a fake list.
 */
export default function NotesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.base }]}>
      <Text variant="title" style={styles.title}>
        Notebook
      </Text>
      <View style={styles.empty}>
        <PipLogo size={88} />
        <Text variant="body" tone="textSecondary" center>
          Notes you take while practising show up here, grouped by technique — with the video
          timestamp they belong to.
        </Text>
        <Text variant="caption" tone="textSecondary" center>
          Arrives with the player in Phase 6.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage, paddingHorizontal: space.base },
  title: { marginBottom: space.base },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.base },
});
