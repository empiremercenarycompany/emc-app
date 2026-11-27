/**
 * Player-facing names for content that is not SRD 5.2.
 * The id is what the database stores. Change displayName here when the lore
 * team sends a canon name. That rename does not need a data migration.
 * TODO(owner): lore team will supply canon names. Do not invent them.
 * pendingRename is for maintainers. Do not show the word "pending" to players.
 */

export type PendingNameKind = "background" | "feat" | "species";

export type PendingName = {
  kind: PendingNameKind;
  id: string;
  displayName: string;
  /** TODO(owner): replace displayName with the lore team's canon name. */
  pendingRename: true;
};

export const PENDING_NAMES: readonly PendingName[] = [
  // Backgrounds kept from the 2024 list that are not in SRD 5.2.
  { kind: "background", id: "artisan", displayName: "Artisan", pendingRename: true },
  { kind: "background", id: "charlatan", displayName: "Charlatan", pendingRename: true },
  { kind: "background", id: "farmer", displayName: "Farmer", pendingRename: true },
  { kind: "background", id: "guard", displayName: "Guard", pendingRename: true },
  { kind: "background", id: "hermit", displayName: "Hermit", pendingRename: true },
  { kind: "background", id: "merchant", displayName: "Merchant", pendingRename: true },
  { kind: "background", id: "noble", displayName: "Noble", pendingRename: true },
  { kind: "background", id: "sailor", displayName: "Sailor", pendingRename: true },
  { kind: "background", id: "scribe", displayName: "Scribe", pendingRename: true },
  { kind: "background", id: "wayfarer", displayName: "Wayfarer", pendingRename: true },
  // Origin feats kept that are not in SRD 5.2. The id is the stored feat name.
  { kind: "feat", id: "Crafter", displayName: "Crafter", pendingRename: true },
  { kind: "feat", id: "Tough", displayName: "Tough", pendingRename: true },
  { kind: "feat", id: "Healer", displayName: "Healer", pendingRename: true },
  { kind: "feat", id: "Lucky", displayName: "Lucky", pendingRename: true },
  { kind: "feat", id: "Tavern Brawler", displayName: "Tavern Brawler", pendingRename: true },
  // Species. Standard names until the lore team renames them. Ids stay put.
  { kind: "species", id: "aasimar", displayName: "Aasimar", pendingRename: true },
  { kind: "species", id: "tiefling", displayName: "Tiefling", pendingRename: true },
];

export function pendingDisplayName(kind: PendingNameKind, id: string | null | undefined): string | null {
  if (!id) return null;
  const row = PENDING_NAMES.find((entry) => entry.kind === kind && entry.id === id);
  return row?.displayName ?? null;
}
