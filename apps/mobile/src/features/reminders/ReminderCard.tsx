import { REMINDER_TIMES, formatTimeOfDay, type ReminderSettings } from '@reps/core';
import { Card, Text, color, radius, space } from '@reps/ui';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import type { PermissionState } from './useReminder';

export interface ReminderCardProps {
  settings: ReminderSettings;
  permission: PermissionState;
  ready: boolean;
  onChange: (patch: Partial<ReminderSettings>) => void;
}

/**
 * The reminder controls.
 *
 * Three decisions, in the order they matter: on or off, when, and whether to
 * bother on a day already practised. The "when" row only appears once it is
 * on, so the off state is a single switch rather than a settings panel.
 */
export function ReminderCard({ settings, permission, ready, onChange }: ReminderCardProps) {
  if (permission === 'unsupported') {
    return (
      <Card>
        <Text variant="caption" tone="textSecondary">
          Reminders need the installed app — the browser build can’t schedule them.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text variant="heading">Daily reminder</Text>
          {/* States where the schedule lives, because that is the reason it
              works offline and the reason it is per-device. */}
          <Text variant="caption" tone="textSecondary">
            Scheduled on this phone. Reps has no way to message you and doesn’t ask for one.
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => onChange({ enabled })}
          disabled={!ready}
          trackColor={{ true: color.brand, false: color.surfaceLocked }}
          accessibilityLabel="Daily practice reminder"
          testID="reminder-toggle"
        />
      </View>

      {settings.enabled ? (
        <>
          <Text variant="overline" tone="textSecondary" style={styles.label}>
            Remind me at
          </Text>
          <View style={styles.times}>
            {REMINDER_TIMES.map((minuteOfDay) => {
              const selected = settings.minuteOfDay === minuteOfDay;

              return (
                <Pressable
                  key={minuteOfDay}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => onChange({ minuteOfDay })}
                  style={[styles.time, selected && styles.timeOn]}
                  testID={`reminder-time-${minuteOfDay}`}
                >
                  <Text
                    variant="caption"
                    style={{ color: selected ? color.textOnBrand : color.textSecondary }}
                  >
                    {formatTimeOfDay(minuteOfDay)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: settings.skipIfPractised }}
            accessibilityLabel="Skip the reminder on days you have already practised"
            onPress={() => onChange({ skipIfPractised: !settings.skipIfPractised })}
            style={styles.skipRow}
            testID="reminder-skip"
          >
            <View style={[styles.box, settings.skipIfPractised && styles.boxOn]}>
              {settings.skipIfPractised ? (
                <Text variant="caption" tone="textOnBrand">
                  ✓
                </Text>
              ) : null}
            </View>
            <Text variant="caption" tone="textSecondary" style={styles.skipCopy}>
              Stay quiet on days I’ve already practised
            </Text>
          </Pressable>

          {permission === 'denied' ? (
            <Text variant="caption" tone="streakText" style={styles.label}>
              Notifications are turned off for Reps in your system settings, so nothing will arrive
              until you allow them there.
            </Text>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headCopy: { flex: 1, minWidth: 0, gap: 2 },
  label: { marginTop: space.base },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  time: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    backgroundColor: color.surfaceSunken,
  },
  timeOn: { backgroundColor: color.brand },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.base,
    minHeight: 44,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: color.brand, borderColor: color.brand },
  skipCopy: { flex: 1, minWidth: 0 },
});
