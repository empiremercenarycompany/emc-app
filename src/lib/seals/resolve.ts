import { factionSeal, MOTIF_SYMBOLS } from "./factions";
import type { DocumentSeal, SealDeviations, SealMotif } from "./types";

const HEX = /^#[0-9a-fA-F]{6}$/;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/;

export type DrawnImpression = { kind: "ring" } | { kind: "path"; d: string };

export type MakerMark = { kind: "none" } | { kind: "notch"; angle: number; glyph: number };

export type ResolvedSeal = {
  factionId: string;
  name: string;
  label: string;
  wax: string;
  rim: string;
  highlight: string;
  body: string;
  drip: string;
  rotation: number;
  impression: DrawnImpression;
  makerMark: MakerMark;
};

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unit(seed: number): number {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function rgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function mix(hex: string, toward: string, amount: number): string {
  const from = rgb(hex);
  const to = rgb(toward);
  const channel = (index: number) => Math.round(from[index] + (to[index] - from[index]) * amount);
  return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, "0")).join("")}`;
}

function blob(seed: number | null): string {
  const cx = 100;
  const cy = 100;
  const radius = 74;
  const steps = 22;
  const points: string[] = [];
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    const wobble = seed == null ? 0 : (unit(seed + index * 17) - 0.5) * 8;
    const pointRadius = radius + wobble;
    points.push(
      `${(cx + Math.cos(angle) * pointRadius).toFixed(1)} ${(cy + Math.sin(angle) * pointRadius).toFixed(1)}`,
    );
  }
  return `M ${points.join(" L ")} Z`;
}

function drip(seed: number | null): string {
  const shift = seed == null ? 0 : (unit(seed + 3) - 0.5) * 18;
  const drop = seed == null ? 22 : 16 + unit(seed + 9) * 20;
  const left = (88 + shift).toFixed(1);
  const right = (112 + shift).toFixed(1);
  const tip = (158 + drop).toFixed(1);
  const mid = (100 + shift).toFixed(1);
  return `M ${left} 148 C ${(92 + shift).toFixed(1)} 160 ${mid} ${tip} ${mid} ${tip} C ${mid} ${tip} ${(108 + shift).toFixed(1)} 160 ${right} 148 Z`;
}

function drawnImpression(motif: SealMotif): DrawnImpression {
  if (motif.kind === "path" && PATH.test(motif.d)) return { kind: "path", d: motif.d };
  if (motif.kind === "symbol") {
    const path = MOTIF_SYMBOLS[motif.id];
    if (path && PATH.test(path)) return { kind: "path", d: path };
  }
  return { kind: "ring" };
}

function impressionFor(motif: SealMotif, deviations: SealDeviations | undefined, forged: boolean): DrawnImpression {
  if (!forged || !deviations?.impression) return drawnImpression(motif);
  return drawnImpression(deviations.impression);
}

/** Resolve a seal for paint. The label is the only player-facing text. */
export function resolveSeal(input: {
  factionId: string;
  makerId?: string;
  genuine?: boolean;
  deviations?: SealDeviations;
  reference?: boolean;
}): ResolvedSeal | null {
  const faction = factionSeal(input.factionId);
  if (!faction) return null;
  const forged = input.genuine === false;
  const shade = forged && input.deviations?.shade && HEX.test(input.deviations.shade) ? input.deviations.shade : faction.color.hex;
  const vary = !input.reference && input.makerId ? hashString(input.makerId) : null;
  const makerMark: MakerMark =
    vary == null
      ? { kind: "none" }
      : { kind: "notch", angle: Math.round(unit(vary + 5) * 360), glyph: Math.floor(unit(vary + 8) * 5) };
  return {
    factionId: faction.id,
    name: faction.name,
    label: `Wax seal of ${faction.name}`,
    wax: shade,
    rim: mix(shade, "#1C1916", 0.55),
    highlight: mix(shade, "#F4EBD8", 0.55),
    body: vary == null ? blob(null) : blob(vary),
    drip: vary == null ? drip(null) : drip(vary),
    rotation: vary == null ? 0 : Math.round((unit(vary + 1) - 0.5) * 16),
    impression: impressionFor(faction.motif, input.deviations, forged),
    makerMark,
  };
}

export function resolveDocumentSeal(seal: DocumentSeal, reference = false): ResolvedSeal | null {
  return resolveSeal({
    factionId: seal.factionId,
    makerId: seal.makerId,
    genuine: seal.genuine,
    deviations: seal.deviations,
    reference,
  });
}
