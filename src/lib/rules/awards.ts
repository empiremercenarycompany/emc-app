/** How many points a log may bank. Attendance ignores the weekly and pool caps. */
export function cappedAward(input: {
  unit: number;
  weekEarned: number;
  poolEarned: number;
  awardedTotal: number;
  weeklyCap: number;
  poolCap: number;
  budget: number;
  exemptFromCaps: boolean;
}): number {
  const budgetRoom = input.budget - input.awardedTotal;
  if (budgetRoom <= 0 || input.unit <= 0) return 0;
  if (input.exemptFromCaps) return Math.min(input.unit, budgetRoom);
  const weekRoom = input.weeklyCap - input.weekEarned;
  const poolRoom = input.poolCap - input.poolEarned;
  if (weekRoom <= 0 || poolRoom <= 0) return 0;
  return Math.min(input.unit, weekRoom, poolRoom, budgetRoom);
}
