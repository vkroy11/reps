import type { NoteWithContext } from './domain';
import {
  fromLocalDay,
  shiftDay,
  toLocalDay,
  type LocalDay,
  type PracticeEntry,
  type WeekDay,
} from './streak';

/**
 * The read-side arithmetic behind Today's panels.
 *
 * Everything here is a pure function of what the API already returns, which is
 * the point: the home screen's charts are not a second source of truth about
 * progress, they are a second *view* of the practice history. Keeping the
 * arithmetic out of the components also makes it testable without a renderer,
 * and a bar chart that is off by a day is not something a screenshot catches.
 */

/**
 * How hard a single day was, as the heatmap paints it.
 *
 * Four steps rather than a continuous scale because the eye cannot read more
 * than about four levels in a 10px square, and because each step here means
 * something a learner can name: nothing, a short stint, the session they
 * planned, and the day a level actually fell.
 */
export type HeatLevel = 0 | 1 | 2 | 3;

export interface HeatCell {
  day: LocalDay;
  minutes: number;
  level: HeatLevel;
  /** Whether a technique reached "solid" on this day. */
  cleared: boolean;
  isToday: boolean;
  /**
   * A day later than today. The grid always ends on a Sunday so its rows line
   * up with weekdays, which leaves up to six trailing cells that have not
   * happened yet - drawn as holes rather than as rest days.
   */
  isFuture: boolean;
}

export interface HeatColumnLabel {
  label: string;
  /** How many columns this month spans, for a proportional header. */
  columns: number;
}

export interface Heatmap {
  /**
   * Column-major: seven cells per week, Monday first, oldest week first.
   *
   * Column-major rather than row-major because that is the order a weekday-
   * aligned grid renders in, and doing the transpose here keeps the component
   * a plain map over an array.
   */
  cells: HeatCell[];
  weeks: number;
  /** Distinct days with any practice in the window. */
  daysPractised: number;
  sessions: number;
  months: HeatColumnLabel[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DayTotal {
  minutes: number;
  sessions: number;
  cleared: boolean;
}

function totalsByDay(entries: PracticeEntry[]): Map<LocalDay, DayTotal> {
  const totals = new Map<LocalDay, DayTotal>();

  for (const entry of entries) {
    const date = new Date(entry.at);
    if (Number.isNaN(date.getTime())) continue;

    const day = toLocalDay(date);
    const running = totals.get(day) ?? { minutes: 0, sessions: 0, cleared: false };

    totals.set(day, {
      minutes: running.minutes + entry.minutes,
      sessions: running.sessions + 1,
      // "Solid" is the reflection that completes a technique, so it is the one
      // signal in a session row that a level was actually cleared.
      cleared: running.cleared || entry.confidence === 'solid',
    });
  }

  return totals;
}

function heatLevel(total: DayTotal | undefined, dailyMinutes: number): HeatLevel {
  if (!total || total.minutes === 0) return 0;
  if (total.cleared) return 3;

  return total.minutes >= dailyMinutes ? 2 : 1;
}

/**
 * The whole path as a calendar, ending on the Sunday of the current week.
 *
 * It ends on a Sunday rather than on today so that every row of the grid is
 * one weekday. Ending it on today would rotate the rows as the week went on,
 * and a heatmap whose rows drift is unreadable.
 */
export function heatmap(
  entries: PracticeEntry[],
  asOf: LocalDay,
  target: { weeks: number; dailyMinutes: number },
): Heatmap {
  const weeks = Math.max(1, Math.floor(target.weeks));
  const totals = totalsByDay(entries);

  // Monday-first weekday of today, so we can walk forward to its Sunday.
  const weekday = (fromLocalDay(asOf).getDay() + 6) % 7;
  const lastDay = shiftDay(asOf, 6 - weekday);
  const firstDay = shiftDay(lastDay, -(weeks * 7 - 1));

  const cells: HeatCell[] = [];
  let daysPractised = 0;
  let sessions = 0;

  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const day = shiftDay(firstDay, offset);
    const total = totals.get(day);

    if (total && total.minutes > 0) daysPractised += 1;
    sessions += total?.sessions ?? 0;

    cells.push({
      day,
      minutes: total?.minutes ?? 0,
      level: heatLevel(total, target.dailyMinutes),
      cleared: total?.cleared ?? false,
      isToday: day === asOf,
      isFuture: day > asOf,
    });
  }

  return { cells, weeks, daysPractised, sessions, months: monthLabels(cells) };
}

/**
 * One label per month present in the grid, sized in columns.
 *
 * A month is attributed to the column its *first* cell falls in - the Monday
 * of that week - which is the convention a reader expects: the label sits over
 * where the month starts, not where it becomes the majority.
 */
function monthLabels(cells: HeatCell[]): HeatColumnLabel[] {
  const labels: HeatColumnLabel[] = [];

  for (let column = 0; column * 7 < cells.length; column += 1) {
    const monday = cells[column * 7];
    if (!monday) continue;

    const month = MONTHS[fromLocalDay(monday.day).getMonth()] ?? '';
    const previous = labels[labels.length - 1];

    if (previous && previous.label === month) previous.columns += 1;
    else labels.push({ label: month, columns: 1 });
  }

  return labels;
}

export interface WeekStats {
  /** Days with any practice, against the days the learner committed to. */
  sessionsHit: number;
  targetDays: number;
  totalMinutes: number;
  /** Averaged over days practised, not over seven - zero when none were. */
  avgMinutes: number;
  /** Days that reached "solid", i.e. levels cleared this week. */
  cleared: number;
}

export function weekStats(
  week: WeekDay[],
  entries: PracticeEntry[],
  daysPerWeek: number,
): WeekStats {
  const totals = totalsByDay(entries);
  const practised = week.filter((day) => day.minutes > 0);
  const totalMinutes = week.reduce((sum, day) => sum + day.minutes, 0);

  return {
    sessionsHit: practised.length,
    targetDays: daysPerWeek,
    totalMinutes,
    avgMinutes: practised.length === 0 ? 0 : Math.round(totalMinutes / practised.length),
    cleared: week.filter((day) => totals.get(day.day)?.cleared).length,
  };
}

/** The sessions logged on one local day, oldest first. */
export function entriesOn(entries: PracticeEntry[], day: LocalDay): PracticeEntry[] {
  return entries
    .filter((entry) => {
      const date = new Date(entry.at);

      return !Number.isNaN(date.getTime()) && toLocalDay(date) === day;
    })
    .sort((left, right) => left.at.localeCompare(right.at));
}

export interface ResumePoint {
  techniqueId: string;
  techniqueTitle: string;
  skill: string;
  /** The resource the note was anchored to, for the deep link. */
  resourceId: string;
  /** Seconds in, which is where the player will be seeked to. */
  atSec: number;
  /** The learner's own words at that moment, as the row's subtitle. */
  body: string;
}

/**
 * Where to pick up, taken from the learner's own timestamped notes.
 *
 * **Why notes and not a watch position.** YouTube's API does not hand a third
 * party anyone's watch history, so the only honest record of where someone got
 * to is one this app made. A note is a stronger signal than a paused player
 * anyway: it is the moment they decided something was worth keeping.
 *
 * One row per resource, at its furthest note, so a technique the learner
 * annotated six times does not fill the whole list.
 */
export function resumePoints(notes: NoteWithContext[], limit: number): ResumePoint[] {
  const furthest = new Map<string, ResumePoint>();
  const lastNoteAt = new Map<string, string>();

  for (const note of notes) {
    if (!note.resourceId || note.timestampSec === null) continue;

    const held = furthest.get(note.resourceId);
    if (!held || note.timestampSec > held.atSec) {
      furthest.set(note.resourceId, {
        techniqueId: note.techniqueId,
        techniqueTitle: note.techniqueTitle,
        skill: note.skill,
        resourceId: note.resourceId,
        atSec: note.timestampSec,
        body: note.body,
      });
    }

    // Ordered by recency of *any* note on the resource, so a technique worked
    // on this morning outranks one annotated further in last month.
    const seen = lastNoteAt.get(note.resourceId);
    if (!seen || note.createdAt > seen) lastNoteAt.set(note.resourceId, note.createdAt);
  }

  return [...furthest.values()]
    .sort((left, right) =>
      (lastNoteAt.get(right.resourceId) ?? '').localeCompare(lastNoteAt.get(left.resourceId) ?? ''),
    )
    .slice(0, limit);
}
