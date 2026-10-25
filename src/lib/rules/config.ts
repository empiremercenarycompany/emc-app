import { utcDate } from "./dates";

/**
 * Mirror of the seeded `scoring_config` row. The database is authoritative
 * at runtime. These defaults exist so the rules tests and the UI preview
 * match a fresh migration. TODO markers are the open questions; do not treat
 * a default as John's final rule.
 */
export type ProgressionConfig = {
  timeZone: string;
  /** TODO(John): placeholder for the January 2027 cohort. Confirm the first session date. */
  cohortStart: Date;
  backfillDays: number;
  /** TODO(John): confirm goals use the same backfill window as workouts. */
  goalBackfillDays: number;
  pointsPerWorkout: number;
  /** TODO(John): confirm custom workouts earn the same as prescribed ones. */
  pointsPerCustomWorkout: number;
  pointsPerGoal: number;
  exercisePointsPerSession: number;
  goalPointsPerSession: number;
  sessionLengthDays: number;
  firstAdventureSessions: number;
  pointBuyBudget: number;
  pointBuyMin: number;
  /** TODO(John): confirm whether purchases stop at 15. */
  pointBuyMax: number;
  /** TODO(John): marketing says 5, the spec says 6. */
  squadMaxSize: number;
  /** TODO(John): self-report awards immediately. Flip only if approval is required. */
  awardRequiresApproval: boolean;
  /** TODO(John): who can read another player's logs. */
  logVisibility: "owner" | "staff" | "squad" | "company";
  inductionWeek: number;
  adventureWeeks: number;
  levelAfterAdventure1: number;
  levelAfterAdventure2: number;
  /** TODO(John): when the Veteran workout tier starts. Null means it is closed. */
  veteranTierStartWeek: number | null;
};

export const defaultProgressionConfig: ProgressionConfig = {
  timeZone: "America/Denver",
  cohortStart: utcDate(2027, 1, 4),
  backfillDays: 14,
  goalBackfillDays: 14,
  pointsPerWorkout: 1,
  pointsPerCustomWorkout: 1,
  pointsPerGoal: 1,
  exercisePointsPerSession: 3,
  goalPointsPerSession: 3,
  sessionLengthDays: 14,
  firstAdventureSessions: 8,
  pointBuyBudget: 27,
  pointBuyMin: 8,
  pointBuyMax: 15,
  squadMaxSize: 6,
  awardRequiresApproval: false,
  logVisibility: "staff",
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
