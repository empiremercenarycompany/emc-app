/** John, Oct 31. Three tracks. More rows can be added in constitution_goal_options. */
export const CON_GOAL_OPTIONS = [
  { id: "sleep", label: "Get enough sleep", condition: "Well Rested" },
  { id: "meal_prep", label: "Meal prep", condition: "Well Fed" },
  { id: "cardio", label: "Do the cardio", condition: "Limbered Up" },
] as const;

export type ConstitutionGoalId = (typeof CON_GOAL_OPTIONS)[number]["id"];

/** Shown on the sheet. Not written into the buff catalog. */
export const CON_INITIATIVE_BONUS = 2;

/**
 * Default reading of "all of their Constitution points":
 * the Constitution score has reached the buy cap (15, same as point_buy_max)
 * and the nutrition-and-sleep bank has nothing left to place.
 * Open for John. Stored as scoring_config.con_goal_score_min.
 */
export const CON_GOAL_SCORE_MIN_DEFAULT = 15;

export function constitutionGoalOption(id: string | null | undefined) {
  if (!id) return null;
  return CON_GOAL_OPTIONS.find((option) => option.id === id) ?? null;
}

export function constitutionBankReady(input: { score: number; unspent: number; scoreMin: number | null | undefined }): boolean {
  const min = input.scoreMin != null && input.scoreMin >= 8 ? input.scoreMin : CON_GOAL_SCORE_MIN_DEFAULT;
  return input.unspent <= 0 && input.score >= min;
}

/** Up to date means the chosen goal was logged for this company week. */
export function constitutionGoalCurrent(input: { choiceId: string | null; markedWeek: string | null; weekStart: string | null }): boolean {
  return Boolean(input.choiceId && input.weekStart && input.markedWeek === input.weekStart);
}

export function constitutionInitiative(input: {
  dexModifier: number;
  ready: boolean;
  current: boolean;
  condition: string | null;
}): { total: number; note: string | null } {
  if (input.ready && input.current && input.condition) {
    return {
      total: input.dexModifier + CON_INITIATIVE_BONUS,
      note: `${input.condition}: +${CON_INITIATIVE_BONUS} initiative`,
    };
  }
  return { total: input.dexModifier, note: null };
}
