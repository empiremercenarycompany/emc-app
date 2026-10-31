import { COMPANY_ZONE, utcDate } from "./dates";

/**
 * Mirror of the seeded `scoring_config` row. The database is authoritative
 * at runtime. These defaults exist so the rules tests and the UI preview
 * match a fresh migration. TODO markers are the open questions; do not treat
 * a default as John's final rule.
 */
export type ProgressionConfig = {
  timeZone: string;
  /** Next adventure start. Posters launch on a later config date. Not the first session ever. */
  cohortStart: Date;
  backfillDays: number;
  /** TODO(John): confirm goals use the same backfill window as workouts. */
  goalBackfillDays: number;
  pointsPerWorkout: number;
  /** TODO(John): confirm custom workouts earn the same as prescribed ones. */
  pointsPerCustomWorkout: number;
  pointsPerGoal: number;
  /** Retired session caps. Awards use weeklyPointCap and poolPointCap. */
  exercisePointsPerSession: number;
  goalPointsPerSession: number;
  weeklyPointCap: number;
  poolPointCap: number;
  attendancePoints: number;
  musterWeek: number;
  paceFullWeek: number;
  paceLightWeek: number;
  paceLightLogs: number;
  sessionLengthDays: number;
  firstAdventureSessions: number;
  pointBuyBudget: number;
  pointBuyMin: number;
  /** TODO(John): confirm whether purchases stop at 15. */
  pointBuyMax: number;
  /** TODO(John): marketing says 5, the spec says 6. */
  squadMaxSize: number;
  awardRequiresApproval: boolean;
  logVisibility: "owner" | "staff" | "squad" | "company";
  inductionWeek: number;
  adventureWeeks: number;
  levelAfterAdventure1: number;
  levelAfterAdventure2: number;
  /** TODO(John): when the Veteran workout tier starts. Null means it is closed. */
  veteranTierStartWeek: number | null;
};

export const defaultProgressionConfig: ProgressionConfig = {
  timeZone: COMPANY_ZONE,
  cohortStart: utcDate(2027, 1, 2),
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
  sessionLengthDays: 14,
  firstAdventureSessions: 8,
  pointBuyBudget: 27,
  pointBuyMin: 8,
  pointBuyMax: 15,
  squadMaxSize: 6,
  awardRequiresApproval: true,
  logVisibility: "company",
  inductionWeek: 6,
  adventureWeeks: 16,
  levelAfterAdventure1: 2,
  levelAfterAdventure2: 3,
  veteranTierStartWeek: null,
};

export function assertProgressionConfig(config: ProgressionConfig): void {
  const positive = [
    config.pointsPerWorkout,
    config.pointsPerCustomWorkout,
    config.pointsPerGoal,
    config.exercisePointsPerSession,
    config.goalPointsPerSession,
    config.weeklyPointCap,
    config.poolPointCap,
    config.attendancePoints,
    config.sessionLengthDays,
    config.firstAdventureSessions,
    config.pointBuyBudget,
    config.squadMaxSize,
  ];
  if (positive.some((value) => value < 1) || config.backfillDays < 0 || config.goalBackfillDays < 0) {
    throw new Error("Progression config is invalid");
  }
  if (!config.timeZone) throw new Error("Progression config is invalid");
}
