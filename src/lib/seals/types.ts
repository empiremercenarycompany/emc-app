/**
 * A seal stamped on a document.
 * `genuine` is DM-only. Rendering never prints it, and no document sets it false yet.
 * A later false seal sets `genuine: false` plus `deviations` (wrong shade, wrong impression).
 */

export type SealMotif =
  | { kind: "placeholder"; id: "ring" }
  | { kind: "path"; id: string; d: string }
  | { kind: "symbol"; id: string };

export type SealDeviations = {
  /** Wrong wax shade. A #RRGGBB color. */
  shade?: string;
  /** Wrong impression. Replaces the faction motif. */
  impression?: SealMotif;
};

export type DocumentSeal = {
  factionId: string;
  makerId: string;
  genuine?: boolean;
  deviations?: SealDeviations;
};
