/** Award pace. Change the numbers here. Future awards only. Nothing recomputes what was already earned. */

export const SESSION_FREE_POINTS = 1;
export const WEEKLY_CAP = 2;
export const PER_POOL_WEEKLY_CAP = 1;
export const CATCHUP_START_WEEK = 8;
export const CATCHUP_WEEKLY_CAP = 3;
export const CATCHUP_PER_POOL_CAP = 2;
export const TARGET_TOTAL = 27;
export const COHORT_WEEKS = 16;

/** Pools: workouts (Strength or Dexterity), Constitution, mental (Intelligence or Wisdom), Charisma. */
export const PACE_POOLS = ["physical", "constitution", "mental", "social"] as const;

/** Whole-number pace line for a company week. Week 8 is 13. Week 16 is 27. */
export function paceTarget(week: number): number {
  if (week < 1) return 0;
  return Math.floor((TARGET_TOTAL * week) / COHORT_WEEKS);
}

export function allowanceFor(week: number | null, earned: number): {
  weeklyCap: number;
  poolCap: number;
  behind: boolean;
  target: number | null;
} {
  if (week == null || week < 1) {
    return { weeklyCap: WEEKLY_CAP, poolCap: PER_POOL_WEEKLY_CAP, behind: false, target: null };
  }
  const target = paceTarget(week);
  const behind = week >= CATCHUP_START_WEEK && earned < target;
  return {
    weeklyCap: behind ? CATCHUP_WEEKLY_CAP : WEEKLY_CAP,
    poolCap: behind ? CATCHUP_PER_POOL_CAP : PER_POOL_WEEKLY_CAP,
    behind,
    target,
  };
}
