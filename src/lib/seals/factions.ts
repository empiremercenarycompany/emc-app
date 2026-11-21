import type { SealMotif } from "./types";

/**
 * Wax color and impression for factions already named in player-facing data.
 * Empire Mercenary Company is the group the app names.
 * The Sirath test book is not a player faction, so its entries are not listed
 * and show no seal.
 *
 * TODO(lore): `color` and `motif` are neutral placeholders. Replace them when
 * the lore keeper sets the real wax color and impression. A real motif is a
 * one-line change to an SVG path or a symbol id:
 *   motif: { kind: "path", id: "your-id", d: "M..." }
 *   motif: { kind: "symbol", id: "your-id" }
 * A path is drawn in a 24 by 24 box. A symbol id reads its path from MOTIF_SYMBOLS.
 * Do not invent faction names, colors, or emblems here.
 */
export const PLACEHOLDER_WAX = {
  "placeholder-stone": "#8C877F",
} as const;

export type PlaceholderWaxId = keyof typeof PLACEHOLDER_WAX;

const RING: SealMotif = { kind: "placeholder", id: "ring" };

export type FactionSeal = {
  id: string;
  name: string;
  color: { id: string; hex: string };
  motif: SealMotif;
};

export const FACTION_SEALS = {
  company: {
    id: "company",
    name: "Empire Mercenary Company",
    color: { id: "placeholder-stone", hex: PLACEHOLDER_WAX["placeholder-stone"] },
    motif: RING,
  },
} as const satisfies Record<string, FactionSeal>;

export type FactionId = keyof typeof FACTION_SEALS;

/** Symbol paths. Empty until a motif symbol id is filled in. An unknown id keeps the ring. */
export const MOTIF_SYMBOLS: Record<string, string> = {};

export function factionSeal(id: string): FactionSeal | null {
  if (Object.prototype.hasOwnProperty.call(FACTION_SEALS, id)) {
    return FACTION_SEALS[id as FactionId];
  }
  return null;
}
