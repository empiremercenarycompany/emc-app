/** Same stat and the same words count as the same goal. */
export function normalizeGoalTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function duplicateGoalTitle(
  goals: { id?: string; category: string; title: string }[],
  category: string,
  title: string,
  exceptId?: string | null,
): boolean {
  const next = normalizeGoalTitle(title);
  if (!next || !category) return false;
  return goals.some(
    (goal) => goal.category === category && goal.id !== exceptId && normalizeGoalTitle(goal.title) === next,
  );
}
