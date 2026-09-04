import { createReminderStore } from '@reps/client';
import { planReminder, type PracticeEntry, type ReminderSettings } from '@reps/core';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { storage } from '../../lib/storage';

/** One identifier, so re-scheduling replaces rather than accumulates. */
const CHANNEL_ID = 'practice-reminder';

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

interface ReminderState {
  settings: ReminderSettings;
  permission: PermissionState;
  /** False until the stored settings have been read. */
  ready: boolean;
  update: (patch: Partial<ReminderSettings>) => Promise<void>;
}

/**
 * The daily practice reminder, scheduled entirely on the device.
 *
 * Rewritten on every launch rather than once at opt-in. That is not belt and
 * braces - iOS can only schedule a local notification while the app is
 * running, and the "skip if already practised" rule depends on today's
 * history, which changes. So the whole schedule is cancelled and rebuilt from
 * the current settings each time, which also means there is no way to leave a
 * stale notification behind.
 *
 * Permission is requested at the moment the learner turns the toggle on, never
 * at launch. A permission prompt on first open, before the app has shown what
 * it does, is how apps get denied permanently.
 */
export function useReminder(input: {
  entries: PracticeEntry[];
  nextTechnique: string | null;
  minutesPerSession: number;
}): ReminderState {
  const store = useMemo(() => createReminderStore(storage), []);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  // Web has no local notification scheduling worth using here.
  const supported = Platform.OS !== 'web';

  useEffect(() => {
    let active = true;

    void (async () => {
      const stored = await store.load();
      if (!active) return;

      setSettings(stored);
      if (!supported) {
        setPermission('unsupported');

        return;
      }

      const status = await Notifications.getPermissionsAsync();
      if (active) setPermission(status.granted ? 'granted' : 'denied');
    })();

    return () => {
      active = false;
    };
  }, [store, supported]);

  // The plan depends on today's history, so it is recomputed rather than
  // cached - but only the rescheduling effect below acts on it.
  const plan = useMemo(
    () =>
      settings === null
        ? null
        : planReminder({
            settings,
            entries: input.entries,
            nextTechnique: input.nextTechnique,
            minutesPerSession: input.minutesPerSession,
            now: new Date(),
          }),
    [settings, input.entries, input.nextTechnique, input.minutesPerSession],
  );

  // Serialised: two overlapping reschedules could interleave a cancel with a
  // schedule and leave nothing registered.
  const pending = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!supported || settings === null || permission !== 'granted') return;

    pending.current = pending.current.then(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (plan === null) return;

      if (Platform.OS === 'android') {
        // Android needs a channel before anything will show at all.
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Practice reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      await Notifications.scheduleNotificationAsync({
        content: { title: plan.title, body: plan.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: plan.hour,
          minute: plan.minute,
          channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        },
      });
    });
  }, [plan, permission, settings, supported]);

  const update = useCallback(
    async (patch: Partial<ReminderSettings>) => {
      if (settings === null) return;

      const next = { ...settings, ...patch };

      // Asked for at the moment it is needed, and only then.
      if (next.enabled && !settings.enabled && supported) {
        const status = await Notifications.requestPermissionsAsync();
        setPermission(status.granted ? 'granted' : 'denied');
        if (!status.granted) {
          // Left off rather than silently on: a toggle that says "on" while
          // the OS refuses to deliver anything is the worst of both.
          setSettings({ ...next, enabled: false });
          await store.save({ ...next, enabled: false });

          return;
        }
      }

      setSettings(next);
      await store.save(next);

      if (!next.enabled && supported) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    },
    [settings, store, supported],
  );

  return {
    settings: settings ?? { enabled: false, minuteOfDay: 19 * 60, skipIfPractised: true },
    permission: supported ? permission : 'unsupported',
    ready: settings !== null,
    update,
  };
}
