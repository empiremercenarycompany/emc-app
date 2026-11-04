/**
 * Player-facing species names. John, Nov 1, 2026.
 * Stored ids stay aasimar and tiefling.
 * These two labels are homebrew. See docs/SPECIES.md.
 * Orc and Ork are different in canon. Do not map one id onto the other.
 */
export const SERAPH = "Seraph";

/** John, Nov 1, 2026. */
export const INFERNI = "Inferni";

const DISPLAY: Record<string, string> = {
  aasimar: SERAPH,
  tiefling: INFERNI,
};

export function speciesLabel(id: string | null | undefined, storedName?: string | null): string {
  if (!id) return storedName ?? "";
  return DISPLAY[id] ?? storedName ?? id;
}
