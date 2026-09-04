import { describe, expect, it } from 'vitest';
import {
  REMINDER_TIMES,
  defaultReminder,
  formatTimeOfDay,
  planReminder,
  practisedOn,
  type ReminderSettings,
} from './reminders';
import { fromLocalDay, toLocalDay, type PracticeEntry } from './streak';

function entry(day: string): PracticeEntry {
  return {
    at: fromLocalDay(day).toISOString(),
    minutes: 20,
    xp: 50,
    pathId: 'p',
    techniqueId: 't',
    confidence: 'solid',
  };
}

function settings(overrides: Partial<ReminderSettings> = {}): ReminderSettings {
  return { ...defaultReminder, enabled: true, ...overrides };
}

/** 2026-09-05 at the given local hour. */
function at(hour: number, minute = 0): Date {
  return new Date(2026, 8, 5, hour, minute);
}

const TODAY = toLocalDay(at(12));

describe('reminder times', () => {
  it('offers a spread across the day, in order', () => {
    expect([...REMINDER_TIMES]).toEqual([...REMINDER_TIMES].sort((a, b) => a - b));
    expect(REMINDER_TIMES.length).toBeGreaterThanOrEqual(4);
  });

  it('is off until asked for', () => {
    expect(defaultReminder.enabled).toBe(false);
  });

  /** A nudge for something already done is the fastest way to become noise. */
  it('defaults to staying quiet on a day already practised', () => {
    expect(defaultReminder.skipIfPractised).toBe(true);
  });

  it('formats a twelve-hour clock', () => {
    expect(formatTimeOfDay(7 * 60)).toBe('7:00 am');
    expect(formatTimeOfDay(12 * 60)).toBe('12:00 pm');
    expect(formatTimeOfDay(19 * 60 + 30)).toBe('7:30 pm');
    expect(formatTimeOfDay(0)).toBe('12:00 am');
  });
});

describe('planning a reminder', () => {
  const base = {
    entries: [] as PracticeEntry[],
    nextTechnique: 'Chord transitions',
    minutesPerSession: 15,
    now: at(9),
  };

  it('schedules nothing when it is switched off', () => {
    expect(planReminder({ ...base, settings: settings({ enabled: false }) })).toBeNull();
  });

  it('schedules at the chosen time', () => {
    const plan = planReminder({ ...base, settings: settings({ minuteOfDay: 19 * 60 + 30 }) });

    expect(plan).toMatchObject({ hour: 19, minute: 30 });
  });

  /** Naming the rep beats nagging about a number. */
  it('names the rep and its length rather than threatening the streak', () => {
    const plan = planReminder({ ...base, settings: settings() });

    expect(plan?.title).toBe('15 min: Chord transitions');
    expect(plan?.title).not.toMatch(/streak/i);
    expect(plan?.body).not.toMatch(/streak|don't lose|keep it up/i);
  });

  it('falls back to a plain nudge when there is no next technique', () => {
    const plan = planReminder({ ...base, settings: settings(), nextTechnique: null });

    expect(plan?.title).toBe('Time to practise');
  });

  describe('when today has already been practised', () => {
    const practised = { ...base, entries: [entry(TODAY)] };

    it('stays quiet if the reminder time has not passed yet', () => {
      expect(planReminder({ ...practised, settings: settings({ minuteOfDay: 19 * 60 }) })).toBeNull();
    });

    /**
     * Past the time, today's notification was never going to fire anyway - so
     * suppressing the schedule would only cancel tomorrow's.
     */
    it('still schedules once the time has gone, for tomorrow', () => {
      const plan = planReminder({
        ...practised,
        settings: settings({ minuteOfDay: 7 * 60 }),
        now: at(21),
      });

      expect(plan).toMatchObject({ hour: 7, minute: 0 });
    });

    it('schedules anyway when the learner asked to be reminded regardless', () => {
      const plan = planReminder({ ...practised, settings: settings({ skipIfPractised: false }) });

      expect(plan).not.toBeNull();
    });
  });

  it('schedules on a day with no practice yet', () => {
    const plan = planReminder({
      ...base,
      settings: settings(),
      entries: [entry(toLocalDay(at(12 - 24)))],
    });

    expect(plan).not.toBeNull();
  });

  it('ignores an unparseable timestamp rather than throwing', () => {
    const plan = planReminder({
      ...base,
      settings: settings(),
      entries: [{ ...entry('2026-09-05'), at: 'nonsense' }],
    });

    expect(plan).not.toBeNull();
  });
});

describe('practisedOn', () => {
  it('is true for a day with a session', () => {
    expect(practisedOn([entry('2026-09-04')], '2026-09-04')).toBe(true);
  });

  it('is false for a day without one', () => {
    expect(practisedOn([entry('2026-09-04')], '2026-09-05')).toBe(false);
  });
});
