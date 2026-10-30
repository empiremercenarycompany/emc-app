/**
 * Player-facing species names. Stored ids stay aasimar and tiefling.
 * Inferni is a placeholder. Change INFERNI here when John picks the real name.
 * These two labels are homebrew. See docs/SPECIES.md.
 */
export const SERAPH = "Seraph";

/** Placeholder. One place to rename later. */
export const INFERNI = "Inferni";

const DISPLAY: Record<string, string> = {
  aasimar: SERAPH,
  tiefling: INFERNI,
};

export function speciesLabel(id: string | null | undefined, storedName?: string | null): string {
  if (!id) return storedName ?? "";
  return DISPLAY[id] ?? storedName ?? id;
}
