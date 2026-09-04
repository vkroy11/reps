import { describe, expect, it } from 'vitest';
import {
  fromLocalDay,
  practisedDays,
  shiftDay,
  streakFrom,
  toLocalDay,
  today,
  weekEndingToday,
  type PracticeEntry,
} from './streak';

/** A session at midday local time on the given local day. */
function entry(day: string, minutes = 20): PracticeEntry {
  return {
    at: fromLocalDay(day).toISOString(),
    minutes,
    xp: minutes * 2,
    pathId: 'path_1',
    techniqueId: 'tec_1',
    confidence: 'getting_there',
  };
}

describe('local days', () => {
  it('formats a date as its own calendar day', () => {
    expect(toLocalDay(new Date(2026, 8, 4, 23, 30))).toBe('2026-09-04');
  });

  it('round-trips through a local day', () => {
    expect(toLocalDay(fromLocalDay('2026-09-04'))).toBe('2026-09-04');
  });

  it('reads today from the clock it is given', () => {
    expect(today(new Date(2026, 8, 4, 9, 15))).toBe('2026-09-04');
  });

  it('steps across a month boundary', () => {
    expect(shiftDay('2026-09-01', -1)).toBe('2026-08-31');
    expect(shiftDay('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('steps across a year boundary', () => {
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles a leap day', () => {
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29');
  });

  /**
   * Anchored at noon rather than midnight. On a spring-forward date midnight
   * may not exist locally, and stepping from a non-existent time can land on
   * the wrong day - which would silently break a streak once or twice a year.
   */
  it('steps one day at a time across daylight-saving transitions', () => {
    // Late March and late October cover both directions in most zones.
    for (const start of ['2026-03-28', '2026-10-24']) {
      let cursor = start;
      const seen: string[] = [];

      for (let step = 0; step < 5; step += 1) {
        cursor = shiftDay(cursor, 1);
        seen.push(cursor);
      }

      expect(new Set(seen).size).toBe(5);
      expect(shiftDay(cursor, -5)).toBe(start);
    }
  });
});

describe('practised days', () => {
  it('collapses several sessions on one day', () => {
    const days = practisedDays([entry('2026-09-04'), entry('2026-09-04'), entry('2026-09-03')]);

    expect(days).toEqual(['2026-09-04', '2026-09-03']);
  });

  it('ignores an unparseable timestamp rather than throwing', () => {
    const days = practisedDays([
      { ...entry('2026-09-04'), at: 'not a date' },
      entry('2026-09-04'),
    ]);

    expect(days).toEqual(['2026-09-04']);
  });
});

describe('the streak', () => {
  it('is zero with no history', () => {
    expect(streakFrom([], '2026-09-04')).toMatchObject({ current: 0, longest: 0 });
  });

  it('counts consecutive days up to today', () => {
    const entries = [entry('2026-09-04'), entry('2026-09-03'), entry('2026-09-02')];

    expect(streakFrom(entries, '2026-09-04')).toMatchObject({
      current: 3,
      practisedToday: true,
    });
  });

  /**
   * The property that stops the number collapsing every midnight. At 9am, a
   * three-day streak should still read 3 - the learner has not failed, they
   * just have not practised yet.
   */
  it('survives a today that has not been practised yet', () => {
    const entries = [entry('2026-09-03'), entry('2026-09-02')];

    expect(streakFrom(entries, '2026-09-04')).toMatchObject({
      current: 2,
      practisedToday: false,
    });
  });

  it('breaks once yesterday is also empty', () => {
    const entries = [entry('2026-09-02'), entry('2026-09-01')];

    expect(streakFrom(entries, '2026-09-04').current).toBe(0);
  });

  it('does not count a day across a gap', () => {
    const entries = [entry('2026-09-04'), entry('2026-09-01')];

    expect(streakFrom(entries, '2026-09-04').current).toBe(1);
  });

  it('remembers the best run even after it breaks', () => {
    const entries = [
      entry('2026-09-04'),
      entry('2026-08-20'),
      entry('2026-08-19'),
      entry('2026-08-18'),
      entry('2026-08-17'),
    ];

    expect(streakFrom(entries, '2026-09-04')).toMatchObject({ current: 1, longest: 4 });
  });

  it('totals the minutes practised', () => {
    const entries = [entry('2026-09-04', 20), entry('2026-09-03', 15)];

    expect(streakFrom(entries, '2026-09-04').totalMinutes).toBe(35);
  });
});

describe('the week strip', () => {
  const target = { dailyMinutes: 20, daysPerWeek: 5 };

  it('always returns seven days ending today', () => {
    const week = weekEndingToday([], '2026-09-04', target);

    expect(week).toHaveLength(7);
    expect(week[6]?.day).toBe('2026-09-04');
    expect(week[6]?.isToday).toBe(true);
    expect(week[0]?.day).toBe('2026-08-29');
  });

  it('marks a day that met the target as done', () => {
    const week = weekEndingToday([entry('2026-09-04', 20)], '2026-09-04', target);

    expect(week[6]?.status).toBe('done');
  });

  it('marks a short session as partial rather than done', () => {
    const week = weekEndingToday([entry('2026-09-04', 6)], '2026-09-04', target);

    expect(week[6]).toMatchObject({ status: 'partial', minutes: 6 });
  });

  it('sums several sessions on the same day', () => {
    const entries = [entry('2026-09-04', 12), entry('2026-09-04', 9)];
    const week = weekEndingToday(entries, '2026-09-04', target);

    expect(week[6]).toMatchObject({ minutes: 21, status: 'done' });
  });

  /** A five-day plan must not show two failures every weekend. */
  it('spends the rest allowance on empty days', () => {
    const week = weekEndingToday([], '2026-09-04', target);
    const rest = week.filter((day) => day.status === 'rest');

    expect(rest).toHaveLength(2);
    expect(week.filter((day) => day.status === 'missed')).toHaveLength(5);
  });

  it('gives a seven-day plan no rest days at all', () => {
    const week = weekEndingToday([], '2026-09-04', { dailyMinutes: 20, daysPerWeek: 7 });

    expect(week.every((day) => day.status === 'missed')).toBe(true);
  });

  /**
   * Rest is spent on the oldest empty days, so a gap right before today still
   * reads as a miss rather than being quietly excused.
   */
  it('leaves a recent gap reading as a miss', () => {
    const entries = [entry('2026-09-04'), entry('2026-09-03')];
    const week = weekEndingToday(entries, '2026-09-04', target);

    expect(week[4]?.status).toBe('missed');
    expect(week[0]?.status).toBe('rest');
  });

  it('numbers the weekday Monday-first', () => {
    // 2026-09-04 is a Friday.
    const week = weekEndingToday([], '2026-09-04', target);

    expect(week[6]?.weekday).toBe(4);
  });

  it('carries the day of the month for the disc', () => {
    const week = weekEndingToday([], '2026-09-04', target);

    expect(week[6]?.dayOfMonth).toBe(4);
    expect(week[0]?.dayOfMonth).toBe(29);
  });
});
