import type { PoolName } from "./pools";
import {
  assertProgressionConfig,
  defaultProgressionConfig,
  type ProgressionConfig,
} from "./config";
import { addUtcDays, asUtcDate, calendarDaysBetween } from "./dates";

export { defaultProgressionConfig };

/** One staff-published award window. Dates are Denver calendar dates, inclusive. */
export type CohortSession = {
  number: number;
  start: Date;
  end: Date;
};

const EXERCISE_POOL: PoolName = "physical";

export function poolForGoalCategory(category: string): PoolName {
  switch (category.toLowerCase()) {
    case "constitution":
    case "con":
    case "nutrition":
    case "sleep":
      return "constitution";
    case "intelligence":
    case "wisdom":
    case "charisma":
    case "int":
    case "wis":
    case "cha":
      return "mental";
    default:
      throw new Error(`Unknown goal category: ${category}`);
  }
}

export function exercisePool(): PoolName {
  return EXERCISE_POOL;
}

function checkSchedule(schedule: CohortSession[]): void {
  const seen = new Set<number>();
  for (const row of schedule) {
    if (row.number < 1) throw new Error("Session numbers start at 1");
    if (seen.has(row.number)) throw new Error("Session numbers must be unique");
    seen.add(row.number);
    if (asUtcDate(row.end).getTime() < asUtcDate(row.start).getTime()) {
      throw new Error("Session end is before its start");
    }
  }
  for (let i = 0; i < schedule.length; i += 1) {
    for (let j = i + 1; j < schedule.length; j += 1) {
      const aStart = asUtcDate(schedule[i].start).getTime();
      const aEnd = asUtcDate(schedule[i].end).getTime();
      const bStart = asUtcDate(schedule[j].start).getTime();
      const bEnd = asUtcDate(schedule[j].end).getTime();
      const overlaps = aEnd >= bStart && bEnd >= aStart;
      if (overlaps) throw new Error("Session windows overlap");
    }
  }
}

/**
 * Session containing the company date.
 * A non-empty schedule replaces the cadence entirely. A date it does not
 * cover is an off-week. An empty schedule uses sessionLengthDays from the anchor.
 */
export function sessionFor(
  companyDate: Date,
  options: {
    anchor?: Date;
    schedule?: CohortSession[];
    config?: ProgressionConfig;
  } = {},
): CohortSession | null {
  const config = options.config ?? defaultProgressionConfig;
  const day = asUtcDate(companyDate);
  const schedule = options.schedule ?? [];
  if (schedule.length > 0) {
    checkSchedule(schedule);
    let match: CohortSession | null = null;
    for (const row of schedule) {
      const start = asUtcDate(row.start);
      const end = asUtcDate(row.end);
      if (day.getTime() < start.getTime() || day.getTime() > end.getTime()) continue;
      if (match) throw new Error("Session windows overlap");
      match = { number: row.number, start, end };
    }
    return match;
  }

  const start = asUtcDate(options.anchor ?? config.cohortStart);
  const offset = calendarDaysBetween(start, day);
  if (offset < 0) return null;
  const index = Math.floor(offset / config.sessionLengthDays);
  const windowStart = addUtcDays(start, index * config.sessionLengthDays);
  return {
    number: index + 1,
    start: windowStart,
    end: addUtcDays(windowStart, config.sessionLengthDays - 1),
  };
}

export function sessionIndex(
  companyDate: Date,
  options: { anchor?: Date; schedule?: CohortSession[]; config?: ProgressionConfig } = {},
): number | null {
  return sessionFor(companyDate, options)?.number ?? null;
}

export function inFirstAdventure(
  companyDate: Date,
  options: { anchor?: Date; schedule?: CohortSession[]; config?: ProgressionConfig } = {},
): boolean {
  const number = sessionIndex(companyDate, options);
  const config = options.config ?? defaultProgressionConfig;
  if (number == null) return false;
  return number <= config.firstAdventureSessions;
}

function allotment(input: {
  unit: number;
  already: number;
  cap: number;
  buildTotal: number;
  budget: number;
}): number {
  const sessionRoom = input.cap - input.already;
  const budgetRoom = input.budget - input.buildTotal;
  if (sessionRoom <= 0 || budgetRoom <= 0) return 0;
  return Math.min(input.unit, sessionRoom, budgetRoom);
}

export function pointsForWorkout(input: {
  logId: string;
  alreadyAwardedLogIds: Set<string>;
  exercisePointsAlreadyInSession: number;
  buildTotal: number;
  logDate: Date;
  today: Date;
  anchor?: Date;
  schedule?: CohortSession[];
  config?: ProgressionConfig;
  custom?: boolean;
}): number {
  const config = input.config ?? defaultProgressionConfig;
  assertProgressionConfig(config);
  if (input.exercisePointsAlreadyInSession < 0) {
    throw new Error("exercisePointsAlreadyInSession cannot be negative");
  }
  if (input.buildTotal < 0) throw new Error("buildTotal cannot be negative");
  const age = calendarDaysBetween(input.logDate, input.today);
  if (age < 0) throw new Error("Future workout dates are rejected");
  if (input.alreadyAwardedLogIds.has(input.logId)) return 0;
  if (age > config.backfillDays) return 0;
  if (!inFirstAdventure(input.logDate, input)) return 0;
  const unit = input.custom ? config.pointsPerCustomWorkout : config.pointsPerWorkout;
  return allotment({
    unit,
    already: input.exercisePointsAlreadyInSession,
    cap: config.exercisePointsPerSession,
    buildTotal: input.buildTotal,
    budget: config.pointBuyBudget,
  });
}

export function pointsForGoal(input: {
  goalId: string;
  alreadyAwardedGoalIds: Set<string>;
  goalPointsAlreadyInSession: number;
  buildTotal: number;
  completedOn: Date;
  today: Date;
  anchor?: Date;
  schedule?: CohortSession[];
  config?: ProgressionConfig;
}): number {
  const config = input.config ?? defaultProgressionConfig;
  assertProgressionConfig(config);
  if (input.goalPointsAlreadyInSession < 0) {
    throw new Error("goalPointsAlreadyInSession cannot be negative");
  }
  if (input.buildTotal < 0) throw new Error("buildTotal cannot be negative");
  const age = calendarDaysBetween(input.completedOn, input.today);
  if (age < 0) throw new Error("Future workout dates are rejected");
  if (input.alreadyAwardedGoalIds.has(input.goalId)) return 0;
  if (age > config.goalBackfillDays) return 0;
  if (!inFirstAdventure(input.completedOn, input)) return 0;
  return allotment({
    unit: config.pointsPerGoal,
    already: input.goalPointsAlreadyInSession,
    cap: config.goalPointsPerSession,
    buildTotal: input.buildTotal,
    budget: config.pointBuyBudget,
  });
}

export function adventureWeek(today: Date, start: Date, adventureWeeks: number): number | null {
  const days = calendarDaysBetween(start, today);
  if (days < 0) return null;
  return Math.min(adventureWeeks, Math.floor(days / 7) + 1);
}

export const WORKOUT_SOURCE = "workout";
export const GOAL_SOURCE = "goal";
