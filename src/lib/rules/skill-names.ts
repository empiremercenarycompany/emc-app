/**
 * Player-facing skill labels. Stored ids stay arcana and religion.
 * Change the two strings here to reverse the Company names.
 */
export const ALCHEMY = "Alchemy";
export const CULTURE = "Culture";

const DISPLAY: Record<string, string> = {
  arcana: ALCHEMY,
  religion: CULTURE,
};

export function skillLabel(idOrName: string | null | undefined, storedName?: string | null): string {
  if (!idOrName) return storedName ?? "";
  const key = idOrName.trim().toLowerCase().replace(/\s+/g, "_");
  return DISPLAY[key] ?? storedName ?? idOrName;
}
