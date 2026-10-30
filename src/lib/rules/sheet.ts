import type { AbilityName } from "./starting-array";

/** SRD 5.2 skill names. Alchemy and Culture are the Company labels. No rules text. */
export const SHEET_SKILLS: { id: string; name: string; ability: AbilityName }[] = [
  { id: "acrobatics", name: "Acrobatics", ability: "dexterity" },
  { id: "animal_handling", name: "Animal Handling", ability: "wisdom" },
  { id: "arcana", name: "Alchemy", ability: "intelligence" },
  { id: "athletics", name: "Athletics", ability: "strength" },
  { id: "deception", name: "Deception", ability: "charisma" },
  { id: "history", name: "History", ability: "intelligence" },
  { id: "insight", name: "Insight", ability: "wisdom" },
  { id: "intimidation", name: "Intimidation", ability: "charisma" },
  { id: "investigation", name: "Investigation", ability: "intelligence" },
  { id: "medicine", name: "Medicine", ability: "wisdom" },
  { id: "nature", name: "Nature", ability: "intelligence" },
  { id: "perception", name: "Perception", ability: "wisdom" },
  { id: "performance", name: "Performance", ability: "charisma" },
  { id: "persuasion", name: "Persuasion", ability: "charisma" },
  { id: "religion", name: "Culture", ability: "intelligence" },
  { id: "sleight_of_hand", name: "Sleight of Hand", ability: "dexterity" },
  { id: "stealth", name: "Stealth", ability: "dexterity" },
  { id: "survival", name: "Survival", ability: "wisdom" },
];

export function proficiencyBonus(level: number): number {
  const safe = Math.min(20, Math.max(1, level));
  return 2 + Math.floor((safe - 1) / 4);
}

export function armorClass(dexMod: number): number {
  return 10 + dexMod;
}

export function walkingSpeed(): number {
  return 30;
}
