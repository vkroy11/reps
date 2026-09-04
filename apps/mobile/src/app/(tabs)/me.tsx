import { stageCount } from '@reps/core';
import { Card, Text, color, space } from '@reps/ui';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SyncCard } from '../../features/auth/SyncCard';
import { usePath, usePathList } from '../../features/paths/usePaths';
import { usePracticeHistory } from '../../features/progress/useStreak';
import { ReminderCard } from '../../features/reminders/ReminderCard';
import { useReminder } from '../../features/reminders/useReminder';
import { resolveApiBaseUrl } from '../../lib/api-base-url';
import { useApp } from '../../providers/app-provider';

/**
 * Not a settings screen: what you have done, one reminder, and the build.
 *
 * Every number here is counted from stored rows - sessions, badges, minutes -
 * rather than estimated, which is why they only appeared once practice was
 * actually being recorded.
 */
export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { api, ready } = useApp();
  const { paths, focusedId } = usePathList();
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);
  const { path } = usePath(focusedId);
  const { entries, streak } = usePracticeHistory();

  const focused = paths.find((item) => item.id === focusedId) ?? null;
  const active = path?.techniques.find((technique) => technique.status === 'active') ?? null;

  const reminder = useReminder({
    entries,
    nextTechnique: active?.title ?? null,
    minutesPerSession: active?.estimatedMinutes ?? focused?.dailyMinutes ?? 20,
  });

  /*
    Asked once, before the card is drawn. The alternative - showing the button
    and discovering server-side that sign-in is unconfigured - turns a missing
    setting into a failed tap.
  */
  useEffect(() => {
    if (!ready || !api) return;

    // Named `cancelled` rather than `active`, which is the active technique
    // three lines up.
    let cancelled = false;
    api
      .authAvailable()
      .then((available) => {
        if (!cancelled) setAuthAvailable(available);
      })
      .catch(() => {
        if (!cancelled) setAuthAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, ready]);

  const completed = paths.reduce((sum, item) => sum + item.completedCount, 0);
  const total = paths.reduce((sum, item) => sum + item.techniqueCount, 0);
  const xp = paths.reduce((sum, item) => sum + item.xp, 0);
  const badges = paths.reduce((sum, item) => sum + item.badges.length, 0);
  const gates = paths.reduce((sum, item) => sum + stageCount(item.techniqueCount), 0);
  const hours = Math.floor(streak.totalMinutes / 60);
  const restMinutes = streak.totalMinutes % 60;

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
        <Row label="Gates cleared" value={`${badges} of ${gates}`} />
        <Row label="XP" value={`${xp}`} />
      </Card>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Practice
      </Text>
      <Card>
        <Row
          label="Current streak"
          value={streak.current === 0 ? 'none yet' : `${streak.current} days`}
        />
        <Row
          label="Best streak"
          value={streak.longest === 0 ? 'none yet' : `${streak.longest} days`}
        />
        <Row
          label="Time practised"
          value={
            streak.totalMinutes === 0
              ? 'none yet'
              : hours === 0
                ? `${restMinutes} min`
                : `${hours} hr ${restMinutes} min`
          }
        />
      </Card>

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Reminder
      </Text>
      <ReminderCard
        settings={reminder.settings}
        permission={reminder.permission}
        ready={reminder.ready}
        onChange={(patch) => void reminder.update(patch)}
      />

      <Text variant="overline" tone="textSecondary" style={styles.label}>
        Account
      </Text>
      <SyncCard serverAvailable={authAvailable} />

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
