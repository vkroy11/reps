import { Card, Text, color, space } from '@reps/ui';
import { Link } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveApiBaseUrl } from '../../lib/api-base-url';
import { usePathList } from '../../features/paths/usePaths';

/**
 * Four rows, not a settings screen. Streaks, reminders and Google sign-in
 * appear here once they have real data behind them - a streak counter with
 * nothing driving it would just be decoration.
 */
export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { paths } = usePathList();

  const completed = paths.reduce((sum, path) => sum + path.completedCount, 0);
  const total = paths.reduce((sum, path) => sum + path.techniqueCount, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.base, paddingBottom: insets.bottom + space.xl },
      ]}
    >
      <Text variant="title">Me</Text>

      <Card>
        <Row label="Skills in progress" value={`${paths.length}`} />
        <Row label="Techniques mastered" value={`${completed} of ${total}`} />
      </Card>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Coming next
      </Text>
      <Card>
        <Text variant="caption" tone="textSecondary">
          Practice reminders, the streak calendar and optional Google sign-in for cross-device sync
          land once practice sessions are recorded — Phase 7.
        </Text>
      </Card>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Build
      </Text>
      <Card>
        <Row label="Platform" value={`${Platform.OS} ${String(Platform.Version ?? '')}`} />
        <Row label="API" value={resolveApiBaseUrl()} />
      </Card>

      {__DEV__ ? (
        <Link href="/gallery" style={styles.devLink}>
          <Text variant="caption" tone="textSecondary">
            Design system (dev)
          </Text>
        </Link>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="textSecondary">
        {label}
      </Text>
      <Text variant="caption" style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfacePage },
  content: {
    paddingHorizontal: space.base,
    gap: space.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  label: { marginTop: space.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.base, paddingVertical: 5 },
  value: { flex: 1, minWidth: 0, textAlign: 'right' },
  devLink: { alignSelf: 'center', paddingVertical: space.base },
});
