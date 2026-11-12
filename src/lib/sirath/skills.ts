import { abilityModifier } from "@/lib/rules/modifiers";
import { languageLabel } from "@/lib/rules/proficiency-grants";
import { SHEET_SKILLS, proficiencyBonus } from "@/lib/rules/sheet";
import type { CharacterRow } from "@/lib/types";
import { KNOWLEDGE_SKILLS, type KnowledgeSkill } from "./types";

/**
 * Company skill labels already rename Arcana to Alchemy and Religion to Culture.
 * Those two sheet skills are the modifiers for the Sirath skills of the same name.
 * History, Medicine, Nature, and Survival use the 2024 skills of the same name.
 * Modifier = ability modifier + proficiency bonus when trained, matching the sheet.
 * Expertise is not stored on the character, so it is not applied.
 * Own-culture +4 is not inferred from species. That membership is a staff field.
 */
const SHEET_ID: Record<KnowledgeSkill, string> = {
  history: "history",
  medicine: "medicine",
  culture: "religion",
  alchemy: "arcana",
  nature: "nature",
  survival: "survival",
};

export function passiveScore(modifier: number): number {
  return 10 + modifier;
}

export function knowledgeModifiers(character: CharacterRow, extraSkillIds: readonly string[] = []): Record<KnowledgeSkill, number> {
  const trained = new Set(
    [character.profession_skill, ...(character.background_skills ?? []), ...(character.granted_skills ?? []), ...(character.sheet?.skills ?? []), ...extraSkillIds]
      .filter((id): id is string => Boolean(id))
      .map((id) => id.trim().toLowerCase().replace(/[\s-]+/g, "_")),
  );
  const bonus = proficiencyBonus(character.level);
  const mods = {} as Record<KnowledgeSkill, number>;
  for (const skill of KNOWLEDGE_SKILLS) {
    const sheetId = SHEET_ID[skill];
    const defined = SHEET_SKILLS.find((row) => row.id === sheetId);
    if (!defined) {
      mods[skill] = 0;
      continue;
    }
    const score = character[defined.ability];
    const trainedSkill =
      trained.has(sheetId) ||
      trained.has(defined.name.toLowerCase()) ||
      trained.has(skill) ||
      (sheetId === "arcana" && trained.has("alchemy")) ||
      (sheetId === "religion" && trained.has("culture"));
    mods[skill] = abilityModifier(score) + (trainedSkill ? bonus : 0);
  }
  return mods;
}

export function characterLanguages(character: CharacterRow): string[] {
  return (character.granted_languages ?? []).map((id) => languageLabel(id));
}

/** Species is not a Sirath culture id. Staff set cultures on character_knowledge. */
export function characterCultures(character: CharacterRow): string[] {
  return character.species ? [] : [];
}
