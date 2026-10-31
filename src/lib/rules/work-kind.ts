export const WORK_KINDS = [
  {
    id: "lifting",
    label: "Lifting and strength",
    type: "strength",
    pool: "physical",
    feedback: "Counts toward Strength or Dexterity.",
  },
  {
    id: "cardio",
    label: "Cardio and conditioning",
    type: "cardio",
    pool: "constitution",
    feedback: "Counts toward Constitution.",
  },
  {
    id: "mobility",
    label: "Mobility and sports",
    type: "mobility",
    pool: "physical",
    feedback: "Counts toward Strength or Dexterity.",
  },
] as const;

export type WorkKindId = (typeof WORK_KINDS)[number]["id"];

export function workKind(id: string) {
  return WORK_KINDS.find((row) => row.id === id) ?? WORK_KINDS[0];
}
