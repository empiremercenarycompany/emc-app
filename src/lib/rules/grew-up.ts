import { ARTISAN_TOOLS, GAMING_SETS, TOOL_LABELS } from "./backgrounds";

/** Names only. No rules text. SRD 5.2 tool, language, instrument, and gaming-set names. */

export const GREW_UP_KINDS = ["tool", "language", "instrument", "gaming"] as const;
export type GrewUpKind = (typeof GREW_UP_KINDS)[number];

const EXTRA_TOOLS = ["disguise", "forgery", "herbalism", "navigator", "poisoner", "thieves"] as const;

export const GREW_UP_LANGUAGES = [
  ["common", "Common"],
  ["common_sign", "Common Sign Language"],
  ["draconic", "Draconic"],
  ["dwarvish", "Dwarvish"],
  ["elvish", "Elvish"],
  ["giant", "Giant"],
  ["gnomish", "Gnomish"],
  ["goblin", "Goblin"],
  ["halfling", "Halfling"],
  ["orc", "Orc"],
] as const;

export const GREW_UP_INSTRUMENTS = [
  ["bagpipes", "Bagpipes"],
  ["drum", "Drum"],
  ["dulcimer", "Dulcimer"],
  ["flute", "Flute"],
  ["horn", "Horn"],
  ["lute", "Lute"],
  ["lyre", "Lyre"],
  ["pan_flute", "Pan flute"],
  ["shawm", "Shawm"],
  ["viol", "Viol"],
] as const;

const EXTRA_TOOL_LABELS: Record<string, string> = {
  disguise: "Disguise kit",
  poisoner: "Poisoner's kit",
};

export function grewUpOptions(kind: GrewUpKind): { id: string; label: string }[] {
  if (kind === "language") return GREW_UP_LANGUAGES.map(([id, label]) => ({ id, label }));
  if (kind === "instrument") return GREW_UP_INSTRUMENTS.map(([id, label]) => ({ id, label }));
  if (kind === "gaming") return GAMING_SETS.map((id) => ({ id, label: TOOL_LABELS[id] ?? id }));
  return [...ARTISAN_TOOLS, ...EXTRA_TOOLS].map((id) => ({
    id,
    label: TOOL_LABELS[id] ?? EXTRA_TOOL_LABELS[id] ?? id,
  }));
}

export function grewUpLabel(kind: string, optionId: string): string {
  const match = GREW_UP_KINDS.includes(kind as GrewUpKind)
    ? grewUpOptions(kind as GrewUpKind).find((option) => option.id === optionId)
    : undefined;
  return match?.label ?? optionId;
}

export function grewUpChoice(kind: string, optionId: string): boolean {
  if (!GREW_UP_KINDS.includes(kind as GrewUpKind)) return false;
  return grewUpOptions(kind as GrewUpKind).some((option) => option.id === optionId);
}
