import { pendingDisplayName } from "@/lib/rules/pending-names";

/**
 * Player-facing species names. Stored ids stay aasimar and tiefling.
 * Aasimar and Tiefling are the labels until the lore team sends canon names.
 * Change those display names in pending-names.ts and nowhere else.
 */
export function speciesLabel(id: string | null | undefined, storedName?: string | null): string {
  if (!id) return storedName ?? "";
  return pendingDisplayName("species", id) ?? storedName ?? id;
}
