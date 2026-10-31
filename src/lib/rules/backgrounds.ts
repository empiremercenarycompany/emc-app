import type { AbilityName, AbilityScores } from "./starting-array";
import { BASE_SCORES } from "./starting-array";

/** 2024 backgrounds that do not grant Magic Initiate. Names and mechanics only. */
export type ToolChoice = "artisan" | "gaming";

export type RecruitBackground = {
  id: string;
  name: string;
  abilities: [AbilityName, AbilityName, AbilityName];
  skills: [string, string];
  /** One id is fixed. More than one is the only picker. */
  tools: string[];
  toolChoice: ToolChoice | null;
  feat: string;
};

export const ARTISAN_TOOLS = [
  "alchemist",
  "brewer",
  "calligrapher",
  "carpenter",
  "cartographer",
  "cobbler",
  "cook",
  "glassblower",
  "jeweler",
  "leatherworker",
  "mason",
  "painter",
  "potter",
  "smith",
  "tinker",
  "weaver",
  "woodcarver",
] as const;

export const GAMING_SETS = ["dice", "dragonchess", "cards", "three_dragon_ante"] as const;

export const TOOL_LABELS: Record<string, string> = {
  alchemist: "Alchemist's supplies",
  brewer: "Brewer's supplies",
  calligrapher: "Calligrapher's supplies",
  carpenter: "Carpenter's tools",
  cartographer: "Cartographer's tools",
  cobbler: "Cobbler's tools",
  cook: "Cook's utensils",
  glassblower: "Glassblower's tools",
  jeweler: "Jeweler's tools",
  leatherworker: "Leatherworker's tools",
  mason: "Mason's tools",
  painter: "Painter's supplies",
  potter: "Potter's tools",
  smith: "Smith's tools",
  tinker: "Tinker's tools",
  weaver: "Weaver's tools",
  woodcarver: "Woodcarver's tools",
  forgery: "Forgery kit",
  herbalism: "Herbalism kit",
  navigator: "Navigator's tools",
  thieves: "Thieves' tools",
  dice: "Dice set",
  dragonchess: "Dragonchess set",
  cards: "Playing card set",
  three_dragon_ante: "Three-Dragon Ante set",
};

/** Acolyte, Guide, and Sage grant Magic Initiate and are not offered. */
export const EXCLUDED_BACKGROUND_IDS = ["acolyte", "guide", "sage"] as const;

export const BACKGROUNDS: RecruitBackground[] = [
  { id: "artisan", name: "Artisan", abilities: ["strength", "dexterity", "intelligence"], skills: ["investigation", "persuasion"], tools: [...ARTISAN_TOOLS], toolChoice: "artisan", feat: "Crafter" },
  { id: "charlatan", name: "Charlatan", abilities: ["dexterity", "constitution", "charisma"], skills: ["deception", "sleight_of_hand"], tools: ["forgery"], toolChoice: null, feat: "Skilled" },
  { id: "criminal", name: "Criminal", abilities: ["dexterity", "constitution", "intelligence"], skills: ["sleight_of_hand", "stealth"], tools: ["thieves"], toolChoice: null, feat: "Alert" },
  { id: "farmer", name: "Farmer", abilities: ["strength", "constitution", "wisdom"], skills: ["animal_handling", "nature"], tools: ["carpenter"], toolChoice: null, feat: "Tough" },
  { id: "guard", name: "Guard", abilities: ["strength", "intelligence", "wisdom"], skills: ["athletics", "perception"], tools: [...GAMING_SETS], toolChoice: "gaming", feat: "Alert" },
  { id: "hermit", name: "Hermit", abilities: ["constitution", "wisdom", "charisma"], skills: ["medicine", "religion"], tools: ["herbalism"], toolChoice: null, feat: "Healer" },
  { id: "merchant", name: "Merchant", abilities: ["constitution", "intelligence", "charisma"], skills: ["animal_handling", "persuasion"], tools: ["navigator"], toolChoice: null, feat: "Lucky" },
  { id: "noble", name: "Noble", abilities: ["strength", "intelligence", "charisma"], skills: ["history", "persuasion"], tools: [...GAMING_SETS], toolChoice: "gaming", feat: "Skilled" },
  { id: "sailor", name: "Sailor", abilities: ["strength", "dexterity", "wisdom"], skills: ["acrobatics", "perception"], tools: ["navigator"], toolChoice: null, feat: "Tavern Brawler" },
  { id: "scribe", name: "Scribe", abilities: ["dexterity", "intelligence", "wisdom"], skills: ["investigation", "perception"], tools: ["calligrapher"], toolChoice: null, feat: "Skilled" },
  { id: "soldier", name: "Soldier", abilities: ["strength", "dexterity", "constitution"], skills: ["athletics", "intimidation"], tools: [...GAMING_SETS], toolChoice: "gaming", feat: "Savage Attacker" },
  { id: "wayfarer", name: "Wayfarer", abilities: ["dexterity", "wisdom", "charisma"], skills: ["insight", "stealth"], tools: ["thieves"], toolChoice: null, feat: "Lucky" },
];

export function backgroundById(id: string): RecruitBackground | undefined {
  return BACKGROUNDS.find((row) => row.id === id);
}

export function toolChoiceLabel(choice: ToolChoice): string {
  return choice === "artisan" ? "Artisan's tools" : "Gaming set";
}

export function recruitScores(
  mode: "plus1" | "plus2",
  abilities: [AbilityName, AbilityName, AbilityName],
  plus2?: AbilityName,
  plus1?: AbilityName,
): AbilityScores | null {
  const scores = { ...BASE_SCORES };
  if (mode === "plus1") {
    for (const ability of abilities) scores[ability] = 9;
    return scores;
  }
  if (!plus2 || !plus1 || plus2 === plus1) return null;
  if (!abilities.includes(plus2) || !abilities.includes(plus1)) return null;
  scores[plus2] = 10;
  scores[plus1] = 9;
  return scores;
}
