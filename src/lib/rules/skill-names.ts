/**
 * Player-facing skill labels. Stored ids stay unchanged.
 * Arcana and Religion are the two Company renames. Change those two strings to reverse them.
 */
export const ALCHEMY = "Alchemy";
export const CULTURE = "Culture";

const DISPLAY: Record<string, string> = {
  acrobatics: "Acrobatics",
  animal_handling: "Animal Handling",
  arcana: ALCHEMY,
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: CULTURE,
  sleight_of_hand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
};

export function skillLabel(idOrName: string | null | undefined, storedName?: string | null): string {
  if (!idOrName) return storedName ?? "";
  const key = idOrName.trim().toLowerCase().replace(/\s+/g, "_");
  return DISPLAY[key] ?? storedName ?? idOrName;
}
