import { describe, expect, it } from 'vitest';
import type { Confidence, NoteWithContext } from './domain';
import { entriesOn, heatmap, resumePoints, weekStats } from './insights';
import { fromLocalDay, weekEndingToday, type PracticeEntry } from './streak';

/** A session at midday local time, so no test depends on the machine's zone. */
function entry(
  day: string,
  minutes = 20,
  confidence: Confidence = 'getting_there',
): PracticeEntry {
  return {
    at: fromLocalDay(day).toISOString(),
    minutes,
    xp: minutes * 2,
    pathId: 'path_1',
    techniqueId: 'tec_1',
    confidence,
  };
}

function note(overrides: Partial<NoteWithContext>): NoteWithContext {
  return {
    id: 'note_1',
    userId: 'usr_1',
    techniqueId: 'tec_1',
    techniqueTitle: 'Chord transitions',
    pathId: 'path_1',
    skill: 'guitar',
    resourceId: 'res_1',
    timestampSec: 100,
    body: 'Pivot finger trick works',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

/* A Saturday, so the grid's trailing-Sunday behaviour is exercised. */
const SATURDAY = '2026-09-05';

describe('heatmap', () => {
  it('always ends on the Sunday of the current week, so rows stay weekdays', () => {
    const grid = heatmap([], SATURDAY, { weeks: 2, dailyMinutes: 20 });

    expect(grid.cells).toHaveLength(14);
    // Monday first in each column, Sunday last in the final one.
    expect(grid.cells[0]?.day).toBe('2026-08-24');
    expect(grid.cells[13]?.day).toBe('2026-09-06');
    expect(fromLocalDay(grid.cells[0]?.day ?? '').getDay()).toBe(1);
    expect(fromLocalDay(grid.cells[13]?.day ?? '').getDay()).toBe(0);
  });

  it('marks the days after today as holes rather than as rest', () => {
    const grid = heatmap([], SATURDAY, { weeks: 1, dailyMinutes: 20 });
    const future = grid.cells.filter((cell) => cell.isFuture);

    // Saturday is today, so only Sunday has not happened.
    expect(future.map((cell) => cell.day)).toEqual(['2026-09-06']);
    expect(grid.cells.filter((cell) => cell.isToday)).toHaveLength(1);
  });

  it('steps a day up as the practice on it goes from short to a full session', () => {
    const grid = heatmap(
      [entry('2026-09-01', 8), entry('2026-09-02', 20), entry('2026-09-03', 0)],
      SATURDAY,
      { weeks: 1, dailyMinutes: 20 },
    );
    const level = (day: string) => grid.cells.find((cell) => cell.day === day)?.level;

    expect(level('2026-08-31')).toBe(0);
    expect(level('2026-09-01')).toBe(1);
    expect(level('2026-09-02')).toBe(2);
    // Logged, but no minutes, so it reads as a day with nothing on it.
    expect(level('2026-09-03')).toBe(0);
  });

  it('gives a day that cleared a level the top step, however short it was', () => {
    const grid = heatmap([entry('2026-09-01', 5, 'solid')], SATURDAY, {
      weeks: 1,
      dailyMinutes: 20,
    });
    const cell = grid.cells.find((item) => item.day === '2026-09-01');

    expect(cell?.level).toBe(3);
    expect(cell?.cleared).toBe(true);
  });

  it('sums several sessions on one day into that day', () => {
    const grid = heatmap([entry('2026-09-01', 12), entry('2026-09-01', 12)], SATURDAY, {
      weeks: 1,
      dailyMinutes: 20,
    });
    const cell = grid.cells.find((item) => item.day === '2026-09-01');

    expect(cell?.minutes).toBe(24);
    expect(cell?.level).toBe(2);
    expect(grid.sessions).toBe(2);
    // Two sessions, one day.
    expect(grid.daysPractised).toBe(1);
  });

  it('counts only what falls inside the window', () => {
    const grid = heatmap([entry('2026-01-01'), entry('2026-09-01')], SATURDAY, {
      weeks: 1,
      dailyMinutes: 20,
    });

    expect(grid.sessions).toBe(1);
    expect(grid.daysPractised).toBe(1);
  });

  it('labels each month over the column it starts in', () => {
    const grid = heatmap([], SATURDAY, { weeks: 3, dailyMinutes: 20 });

    // Weeks beginning 17 Aug, 24 Aug, 31 Aug: two August columns, then one
    // whose Monday is 31 August - so August, not September.
    expect(grid.months).toEqual([{ label: 'Aug', columns: 3 }]);
  });

  it('never returns an empty grid, whatever it is asked for', () => {
    expect(heatmap([], SATURDAY, { weeks: 0, dailyMinutes: 20 }).cells).toHaveLength(7);
  });

  it('ignores an unparseable timestamp rather than throwing', () => {
    const grid = heatmap([{ ...entry('2026-09-01'), at: 'nonsense' }], SATURDAY, {
      weeks: 1,
      dailyMinutes: 20,
    });

    expect(grid.sessions).toBe(0);
  });
});

describe('weekStats', () => {
  const target = { dailyMinutes: 20, daysPerWeek: 5 };

  it('averages over the days practised, not over seven', () => {
    const entries = [entry('2026-09-04', 30), entry('2026-09-05', 10)];
    const stats = weekStats(weekEndingToday(entries, SATURDAY, target), entries, 5);

    expect(stats.sessionsHit).toBe(2);
    expect(stats.totalMinutes).toBe(40);
    // 40 over two days, not 40 over seven - the second would read as a
    // collapse in effort on every rest day.
    expect(stats.avgMinutes).toBe(20);
  });

  it('reports no average rather than dividing by zero on an empty week', () => {
    const stats = weekStats(weekEndingToday([], SATURDAY, target), [], 5);

    expect(stats).toMatchObject({ sessionsHit: 0, totalMinutes: 0, avgMinutes: 0, cleared: 0 });
  });

  it('counts the days a level was cleared', () => {
    const entries = [
      entry('2026-09-03', 20, 'solid'),
      entry('2026-09-04', 20, 'struggling'),
      entry('2026-09-05', 20, 'solid'),
    ];
    const stats = weekStats(weekEndingToday(entries, SATURDAY, target), entries, 5);

    expect(stats.cleared).toBe(2);
  });

  it('carries the committed days through, so the ratio has a denominator', () => {
    expect(weekStats(weekEndingToday([], SATURDAY, target), [], 3).targetDays).toBe(3);
  });
});

describe('entriesOn', () => {
  it('returns one day of sessions, oldest first', () => {
    const early = { ...entry('2026-09-04'), at: '2026-09-04T08:00:00.000Z' };
    const late = { ...entry('2026-09-04'), at: '2026-09-04T09:00:00.000Z' };
    const found = entriesOn([late, early, entry('2026-09-03')], '2026-09-04');

    expect(found.map((item) => item.at)).toEqual([early.at, late.at]);
  });
});

describe('resumePoints', () => {
  it('offers the furthest point reached in a resource', () => {
    const points = resumePoints(
      [
        note({ id: 'n1', timestampSec: 45 }),
        note({ id: 'n2', timestampSec: 222 }),
        note({ id: 'n3', timestampSec: 120 }),
      ],
      5,
    );

    expect(points).toHaveLength(1);
    expect(points[0]?.atSec).toBe(222);
  });

  it('skips notes with nothing to seek to', () => {
    const points = resumePoints(
      [
        note({ id: 'n1', resourceId: null, timestampSec: null }),
        note({ id: 'n2', resourceId: 'res_2', timestampSec: null }),
      ],
      5,
    );

    expect(points).toEqual([]);
  });

  it('puts the most recently annotated resource first', () => {
    const points = resumePoints(
      [
        note({
          id: 'old',
          resourceId: 'res_old',
          timestampSec: 300,
          createdAt: '2026-08-01T10:00:00.000Z',
        }),
        note({
          id: 'new',
          resourceId: 'res_new',
          timestampSec: 10,
          createdAt: '2026-09-04T10:00:00.000Z',
        }),
      ],
      5,
    );

    // Recency wins over how far in the note is: the point of the row is what
    // the learner was last doing.
    expect(points.map((point) => point.resourceId)).toEqual(['res_new', 'res_old']);
  });

  it('honours the limit', () => {
    const notes = [1, 2, 3, 4].map((n) =>
      note({ id: `n${n}`, resourceId: `res_${n}`, createdAt: `2026-09-0${n}T10:00:00.000Z` }),
    );

    expect(resumePoints(notes, 2)).toHaveLength(2);
  });
});
