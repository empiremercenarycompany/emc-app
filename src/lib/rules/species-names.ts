/**
 * Player-facing species names. Stored ids stay aasimar and tiefling.
 * Inferni is the working final name. John may still rename it.
 * Change INFERNI here and nowhere else.
 * These two labels are homebrew. See docs/SPECIES.md.
 */
export const SERAPH = "Seraph";

/** Working final name. One place to rename later. */
export const INFERNI = "Inferni";

const DISPLAY: Record<string, string> = {
  aasimar: SERAPH,
  tiefling: INFERNI,
};

export function speciesLabel(id: string | null | undefined, storedName?: string | null): string {
  if (!id) return storedName ?? "";
  return DISPLAY[id] ?? storedName ?? id;
}
