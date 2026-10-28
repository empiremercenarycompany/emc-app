import { addUtcDays, asUtcDate, calendarDaysBetween, formatDate } from "./dates";
import { sessionFor, type CohortSession } from "./progression";

export type CalendarKind = "session" | "off-week" | "three-parter";

export type CalendarBlock = {
  start: string;
  end: string;
  kind: CalendarKind;
  sessionNumber: number | null;
  markers: string[];
};

/** Week 1 is the first seven Denver days from the cohort anchor. Null before that day. */
export function companyWeekNumber(day: Date, anchor: Date): number | null {
  const offset = calendarDaysBetween(asUtcDate(anchor), asUtcDate(day));
  if (offset < 0) return null;
  return Math.floor(offset / 7) + 1;
}

/**
 * The next milestone a staff action may apply, one step at a time.
 * A null week, or a week before the placeholder, returns null.
 * The call never lowers a level.
 */
export function milestoneAdvance(input: {
  level: number;
  week: number | null;
  levelTwoWeek: number;
  levelThreeWeek: number;
  levelTwo: number;
  levelThree: number;
}): number | null {
  if (input.week == null) return null;
  if (input.level < input.levelTwo && input.week >= input.levelTwoWeek) return input.levelTwo;
  if (
    input.level >= input.levelTwo &&
    input.level < input.levelThree &&
    input.week >= input.levelThreeWeek
  ) {
    return input.levelThree;
  }
  return null;
}

function markersForDay(
  day: Date,
  anchor: Date,
  inductionWeek: number,
  levelTwoWeek: number,
  levelThreeWeek: number,
): string[] {
  const week = companyWeekNumber(day, anchor);
  if (week == null) return [];
  const markers: string[] = [];
  if (week === inductionWeek) markers.push("Induction");
  if (week === levelTwoWeek) markers.push("Level 2");
  if (week === levelThreeWeek) markers.push("Level 3");
  return markers;
}

/**
 * Inclusive Denver spans from the cohort anchor through `throughWeek`.
 * An empty schedule uses the cadence. A published schedule replaces it:
 * a span longer than the cadence is a three-parter, and a date in no row is an off-week.
 */
export function calendarBlocks(input: {
  anchor: Date;
  throughWeek: number;
  sessionLengthDays: number;
  schedule: CohortSession[];
  inductionWeek: number;
  levelTwoWeek: number;
  levelThreeWeek: number;
}): CalendarBlock[] {
  const anchor = asUtcDate(input.anchor);
  const last = addUtcDays(anchor, input.throughWeek * 7 - 1);
  const blocks: CalendarBlock[] = [];

  let cursor = anchor;
  while (cursor.getTime() <= last.getTime()) {
    const window = sessionFor(cursor, {
      anchor,
      schedule: input.schedule,
      config: {
        timeZone: "America/Denver",
        cohortStart: anchor,
        backfillDays: 14,
        goalBackfillDays: 14,
        pointsPerWorkout: 1,
        pointsPerCustomWorkout: 1,
        pointsPerGoal: 1,
        exercisePointsPerSession: 3,
        goalPointsPerSession: 3,
        weeklyPointCap: 4,
        poolPointCap: 2,
        attendancePoints: 2,
        musterWeek: 10,
        paceFullWeek: 6,
        paceLightWeek: 10,
        paceLightLogs: 2,
        sessionLengthDays: input.sessionLengthDays,
        firstAdventureSessions: 8,
        pointBuyBudget: 27,
        pointBuyMin: 8,
        pointBuyMax: 15,
        squadMaxSize: 6,
        awardRequiresApproval: false,
        logVisibility: "staff",
        inductionWeek: input.inductionWeek,
        adventureWeeks: 16,
        levelAfterAdventure1: 2,
        levelAfterAdventure2: 3,
        veteranTierStartWeek: null,
      },
    });

    let kind: CalendarKind = "off-week";
    let sessionNumber: number | null = null;
    let blockEnd = cursor;
    if (window && cursor.getTime() >= asUtcDate(window.start).getTime() && cursor.getTime() <= asUtcDate(window.end).getTime()) {
      sessionNumber = window.number;
      const length = calendarDaysBetween(window.start, window.end) + 1;
      kind = length > input.sessionLengthDays ? "three-parter" : "session";
      blockEnd = asUtcDate(window.end).getTime() < last.getTime() ? asUtcDate(window.end) : last;
      if (asUtcDate(window.start).getTime() > cursor.getTime()) {
        kind = "off-week";
        sessionNumber = null;
        blockEnd = addUtcDays(asUtcDate(window.start), -1);
      }
    } else {
      const nextStart = input.schedule
        .map((row) => asUtcDate(row.start))
        .filter((start) => start.getTime() > cursor.getTime())
        .sort((a, b) => a.getTime() - b.getTime())[0];
      blockEnd = nextStart ? addUtcDays(nextStart, -1) : last;
      if (blockEnd.getTime() > last.getTime()) blockEnd = last;
    }

    const markers: string[] = [];
    for (let day = cursor; day.getTime() <= blockEnd.getTime(); day = addUtcDays(day, 1)) {
      for (const marker of markersForDay(day, anchor, input.inductionWeek, input.levelTwoWeek, input.levelThreeWeek)) {
        if (!markers.includes(marker)) markers.push(marker);
      }
    }

    blocks.push({
      start: formatDate(cursor),
      end: formatDate(blockEnd),
      kind,
      sessionNumber,
      markers,
    });
    cursor = addUtcDays(blockEnd, 1);
  }

  return blocks;
}

/** A fixed illustration so the calendar page can show both shapes without a database. */
export function sampleCalendar(): CalendarBlock[] {
  return calendarBlocks({
    anchor: new Date(Date.UTC(2027, 0, 4)),
    throughWeek: 8,
    sessionLengthDays: 14,
    schedule: [
      { number: 1, start: new Date(Date.UTC(2027, 0, 4)), end: new Date(Date.UTC(2027, 0, 31)) },
      { number: 2, start: new Date(Date.UTC(2027, 1, 15)), end: new Date(Date.UTC(2027, 1, 28)) },
    ],
    inductionWeek: 6,
    levelTwoWeek: 16,
    levelThreeWeek: 32,
  });
}
