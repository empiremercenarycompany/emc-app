/** John, 2026-10-31. Configurable on scoring_config.level_four_steps_required. */
export const LEVEL_FOUR_STEPS_DEFAULT = 4;

export const GOAL_REWARD_READY = "Goal reward ready: see your DM";

/** The only buffs John named. More rows can be added in goal_reward_buffs. */
export const GOAL_REWARD_BUFF_SEED = [
  { id: "heroic_inspiration", name: "Heroic Inspiration" },
  { id: "advantage_one_check", name: "Advantage on one check" },
] as const;

export function levelFourSteps(required: number | null | undefined): number {
  if (required == null || !Number.isFinite(required) || required < 1) return LEVEL_FOUR_STEPS_DEFAULT;
  return Math.floor(required);
}

export function levelFourProgress(
  completed: number,
  required: number | null | undefined,
): { completed: number; required: number; label: string } {
  const steps = levelFourSteps(required);
  const done = Math.max(0, Math.floor(completed));
  return { completed: done, required: steps, label: `${done} of ${steps}` };
}

/** Long-term goals toward level 4 are only for a level 3 character. */
export function showsLevelFourProgress(level: number): boolean {
  return level === 3;
}

export function showsMilestoneLevels(level: number): boolean {
  return level >= 1 && level <= 3;
}
