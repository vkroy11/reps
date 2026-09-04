import { z } from 'zod';
import { toLocalDay, type LocalDay, type PracticeEntry } from './streak';

/**
 * Practice reminders.
 *
 * **Local notifications only.** A daily nudge at a time the learner chose needs
 * no server, no push token, and no FCM or APNs credentials - the OS holds the
 * schedule and fires it whether or not the app has run since. Pushing it from
 * our own backend would mean a device-token table, a scheduler that has to know
 * every user's timezone, and a delivery path that fails silently. The only
 * thing a server could add is a reminder that reacts to something we learned
 * after the app closed, and there is nothing like that here.
 *
 * The consequence worth knowing: on iOS a local notification can only be
 * scheduled while the app is running, so the schedule is rewritten on every
 * launch rather than once at opt-in.
 */

export const ReminderSettingsSchema = z.object({
  enabled: z.boolean(),
  /** Minutes past local midnight, so it survives a timezone change. */
  minuteOfDay: z.number().int().min(0).max(24 * 60 - 1),
  /**
   * Skip the reminder on a day already practised.
   *
   * On by default: a nudge to do something already done is the fastest way to
   * teach someone that the app's notifications are noise.
   */
  skipIfPractised: z.boolean(),
});
export type ReminderSettings = z.infer<typeof ReminderSettingsSchema>;

/** Evening, after work, before it is too late to do twenty minutes. */
export const defaultReminder: ReminderSettings = {
  enabled: false,
  minuteOfDay: 19 * 60,
  skipIfPractised: true,
};

/** The times offered, as minutes past midnight. */
export const REMINDER_TIMES = [7 * 60, 12 * 60, 17 * 60, 19 * 60, 21 * 60] as const;

export function formatTimeOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const suffix = hour < 12 ? 'am' : 'pm';
  const display = hour % 12 === 0 ? 12 : hour % 12;

  return `${display}:${`${minute}`.padStart(2, '0')} ${suffix}`;
}

/** What the OS should be asked to fire, or null when nothing should be. */
export interface ReminderPlan {
  hour: number;
  minute: number;
  title: string;
  body: string;
}

/**
 * Turns settings plus today's history into what the OS should hold.
 *
 * Returns null rather than a disabled plan when there is nothing to schedule,
 * so the caller's job is always "cancel everything, then schedule what this
 * returns" - one code path, no stale notification left behind by a branch that
 * forgot to cancel.
 *
 * `skipIfPractised` is honoured by *not scheduling today's* reminder, which is
 * the only thing a local schedule can do: the OS fires on a repeating trigger
 * and cannot ask us at delivery time whether the day was already practised.
 */
export function planReminder(input: {
  settings: ReminderSettings;
  entries: PracticeEntry[];
  /** The learner's next rep, so the notification says something specific. */
  nextTechnique: string | null;
  minutesPerSession: number;
  now: Date;
}): ReminderPlan | null {
  const { settings, nextTechnique, minutesPerSession, now } = input;
  if (!settings.enabled) return null;

  const today = toLocalDay(now);
  const practisedToday = input.entries.some((entry) => {
    const at = new Date(entry.at);

    return !Number.isNaN(at.getTime()) && toLocalDay(at) === today;
  });

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const alreadyPassed = minutesNow >= settings.minuteOfDay;

  // Nothing to fire today: either it is done or the time has gone. The
  // repeating daily trigger still covers tomorrow, so this only suppresses a
  // notification that would arrive within the next few hours.
  if (settings.skipIfPractised && practisedToday && !alreadyPassed) return null;

  return {
    hour: Math.floor(settings.minuteOfDay / 60),
    minute: settings.minuteOfDay % 60,
    title: nextTechnique === null ? 'Time to practise' : `${minutesPerSession} min: ${nextTechnique}`,
    /*
      Names the rep rather than nagging. "Keep your streak!" is a threat about
      a number; naming the technique is a reminder of the thing the learner
      actually wanted to be able to do.
    */
    body:
      nextTechnique === null
        ? 'Open Reps and pick up where you left off.'
        : 'One rep is enough to count.',
  };
}

/** Whether a day counts as practised, for the reminder's own decision. */
export function practisedOn(entries: PracticeEntry[], day: LocalDay): boolean {
  return entries.some((entry) => {
    const at = new Date(entry.at);

    return !Number.isNaN(at.getTime()) && toLocalDay(at) === day;
  });
}
