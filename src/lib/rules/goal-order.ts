/** Stable order for steps under one long-term goal. Oldest first, then id. */
export function compareGoalSteps(a: { createdAt: string; id: string }, b: { createdAt: string; id: string }): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}
