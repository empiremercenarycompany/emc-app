export type GroupGoalDraft = {
  title: string;
  squadId: string | null;
  description: string;
  objectiveTitle: string;
  target: string;
  unit: string;
};

/** Values the group-goal form posts. The squad id is null only when the recruit chose the whole company. */
export function groupGoalDraft(formData: FormData): GroupGoalDraft {
  const squad = String(formData.get("goal_squad_id") ?? "").trim();
  return {
    title: String(formData.get("goal_title") ?? "").trim(),
    squadId: squad || null,
    description: String(formData.get("description") ?? "").trim(),
    objectiveTitle: String(formData.get("objective_title") ?? "").trim(),
    target: String(formData.get("objective_target") ?? "").trim(),
    unit: String(formData.get("objective_unit") ?? "").trim(),
  };
}
