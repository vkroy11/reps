import { ReminderSettingsSchema, defaultReminder, type ReminderSettings } from '@reps/core';
import { createJsonStore, storageKey, type Storage } from './storage';

/**
 * Reminder settings, on the device only.
 *
 * Never synced. A reminder is a property of *this* phone - the one holding the
 * OS schedule - so replicating it to an account would mean two devices both
 * firing the same nudge, and a timezone stored on a server that goes stale the
 * moment someone travels.
 */
export function createReminderStore(storage: Storage) {
  const json = createJsonStore(storage);

  return {
    async load(): Promise<ReminderSettings> {
      const stored = await json.read(storageKey.reminder, (value) => {
        const parsed = ReminderSettingsSchema.safeParse(value);

        return parsed.success ? parsed.data : null;
      });

      return stored ?? defaultReminder;
    },

    async save(settings: ReminderSettings): Promise<void> {
      await json.write(storageKey.reminder, settings);
    },
  };
}

export type ReminderStore = ReturnType<typeof createReminderStore>;
