import { abilityModifier } from "@/lib/rules/modifiers";
import { languageLabel } from "@/lib/rules/proficiency-grants";
import { SHEET_SKILLS, proficiencyBonus } from "@/lib/rules/sheet";
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

export type KnowledgeInput = {
  level: number;
  intelligence: number;
  wisdom: number;
  profession_skill?: string | null;
  background_skills?: readonly string[] | null;
  granted_skills?: readonly string[] | null;
  sheet?: { skills?: string[] | null } | null;
  /** Staff override on character_knowledge. A set key replaces the sheet formula. */
  skill_mods?: Partial<Record<KnowledgeSkill, number>> | null;
  /** character_proficiencies rows. kind "skill" counts as trained, matching the SQL function. */
  proficiencyRows?: readonly { kind: string; optionId: string }[] | null;
  /** character_knowledge.cultures. Species is not a culture. */
  cultures?: readonly string[] | null;
  granted_languages?: readonly string[] | null;
  species?: string | null;
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function knowledgeModifiers(character: KnowledgeInput, extraSkillIds: readonly string[] = []): Record<KnowledgeSkill, number> {
  const trained = new Set(
    [
      character.profession_skill,
      ...(character.background_skills ?? []),
      ...(character.granted_skills ?? []),
      ...(character.sheet?.skills ?? []),
      ...(character.proficiencyRows ?? []).filter((row) => row.kind === "skill").map((row) => row.optionId),
      ...extraSkillIds,
    ]
      .filter((id): id is string => Boolean(id))
      .map(normalize),
  );
  const bonus = proficiencyBonus(character.level);
  const mods = {} as Record<KnowledgeSkill, number>;
  for (const skill of KNOWLEDGE_SKILLS) {
    const override = character.skill_mods?.[skill];
    if (typeof override === "number") {
      mods[skill] = override;
      continue;
    }
    const sheetId = SHEET_ID[skill];
    const defined = SHEET_SKILLS.find((row) => row.id === sheetId);
    if (!defined) {
      mods[skill] = 0;
      continue;
    }
    const score = defined.ability === "wisdom" ? character.wisdom : character.intelligence;
    const trainedSkill =
      trained.has(sheetId) ||
      trained.has(normalize(defined.name)) ||
      trained.has(skill) ||
      (sheetId === "arcana" && trained.has("alchemy")) ||
      (sheetId === "religion" && trained.has("culture"));
    mods[skill] = abilityModifier(score) + (trainedSkill ? bonus : 0);
  }
  return mods;
}

export function characterLanguages(character: { granted_languages?: readonly string[] | null }): string[] {
  return (character.granted_languages ?? []).map((id) => languageLabel(id));
}

/** Staff cultures only. A species id is not a Sirath culture key, so it is not read. */
export function characterCultures(character: { cultures?: readonly string[] | null; species?: string | null }): string[] {
  void character.species;
  return [...(character.cultures ?? [])];
}
