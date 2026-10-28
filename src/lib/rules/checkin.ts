/** Weekly compliance score. Max is 2. A workout count of 0 or 1 scores 0. */
export function checkinScore(input: {
  workouts: number;
  wis: boolean;
  int: boolean;
  cha: boolean;
}): number {
  if (input.workouts <= 1) return 0;
  let misses = input.workouts === 2 ? 1 : 0;
  if (!input.wis) misses += 1;
  if (!input.int) misses += 1;
  if (!input.cha) misses += 1;
  return Math.max(0, 2 - misses);
}

/** earned / (2 × roster × weeks). Null when the denominator is 0. */
export function complianceRatio(earned: number, roster: number, weeks: number): number | null {
  const denominator = 2 * roster * weeks;
  if (denominator <= 0) return null;
  return earned / denominator;
}

export function preInductionHp(input: {
  constitution: number;
  species: string | null;
  originWord: string | null;
  base?: number;
  toughBonus?: number;
  dwarfBonus?: number;
}): number {
  const base = input.base ?? 6;
  const modifier = Math.floor((input.constitution - 10) / 2);
  let extra = 0;
  if ((input.originWord ?? "").toLowerCase() === "tough") extra += input.toughBonus ?? 2;
  if ((input.species ?? "").toLowerCase() === "dwarf") extra += input.dwarfBonus ?? 1;
  return base + modifier + extra;
}
