import { languageLabel, toolLabel, weaponLabel } from "./proficiency-grants";
import { SHEET_SKILLS } from "./sheet";
import { skillLabel } from "./skill-names";

/**
 * Who at the table is trained in one skill.
 * Sources are the character columns, character_proficiencies / npc_proficiencies
 * rows whose kind is skill, and skill names already written on the sheet.
 * Tool, language, weapon, and gaming rows are not skills.
 * Labels come from skill_labels when the caller has them. Ids stay the stored ids.
 */

export type SkillLabelRow = {
  id: string;
  displayName: string;
  defaultName?: string | null;
};

export type ProficiencyRow = {
  kind: string;
  optionId: string;
};

export type TablePerson = {
  name: string;
  example?: boolean;
  professionSkill?: string | null;
  backgroundSkills?: readonly string[] | null;
  grantedSkills?: readonly string[] | null;
  proficiencyRows?: readonly ProficiencyRow[] | null;
  recordedSkills?: readonly string[] | null;
};

export type ProficientName = {
  name: string;
  example: boolean;
};

const RULES_NAMES: Record<string, string> = {
  arcana: "Arcana",
  religion: "Religion",
};

export function normalizeSkillKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function skillCatalog(rows?: readonly SkillLabelRow[] | null): SkillLabelRow[] {
  const byId = new Map<string, SkillLabelRow>();
  for (const skill of SHEET_SKILLS) {
    byId.set(skill.id, {
      id: skill.id,
      displayName: skillLabel(skill.id),
      defaultName: RULES_NAMES[skill.id] ?? skill.name,
    });
  }
  for (const row of rows ?? []) {
    const id = normalizeSkillKey(row.id);
    const current = byId.get(id);
    if (!current) continue;
    const displayName = row.displayName.trim();
    const defaultName = row.defaultName?.trim();
    byId.set(id, {
      id,
      displayName: displayName || current.displayName,
      defaultName: defaultName || current.defaultName,
    });
  }
  return [...byId.values()];
}

export function skillsForPicker(catalog: readonly SkillLabelRow[]): SkillLabelRow[] {
  return [...catalog].sort((a, b) => skillOptionLabel(a).localeCompare(skillOptionLabel(b)));
}

export function skillOptionLabel(row: SkillLabelRow): string {
  return row.displayName.trim() || skillLabel(row.id);
}

export function resolveSkillId(query: string, catalog: readonly SkillLabelRow[]): string | null {
  const key = normalizeSkillKey(query);
  if (!key) return null;
  for (const row of catalog) {
    const names = [row.id, row.displayName, row.defaultName ?? ""];
    if (names.some((name) => normalizeSkillKey(name) === key)) return row.id;
  }
  return null;
}

export function trainedSkillIds(person: TablePerson, catalog: readonly SkillLabelRow[]): string[] {
  const ids: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const id = resolveSkillId(raw, catalog);
    if (!id || ids.includes(id)) return;
    ids.push(id);
  };
  push(person.professionSkill);
  for (const id of person.backgroundSkills ?? []) push(id);
  for (const id of person.grantedSkills ?? []) push(id);
  for (const row of person.proficiencyRows ?? []) {
    if (row.kind !== "skill") continue;
    push(row.optionId);
  }
  for (const recorded of person.recordedSkills ?? []) push(recorded);
  return ids;
}

export function proficientAtTable(
  skillQuery: string,
  people: readonly TablePerson[],
  catalog: readonly SkillLabelRow[],
): ProficientName[] {
  const skillId = resolveSkillId(skillQuery, catalog);
  if (!skillId) return [];
  const found: ProficientName[] = [];
  for (const person of people) {
    const name = person.name.trim();
    if (!name) continue;
    if (!trainedSkillIds(person, catalog).includes(skillId)) continue;
    found.push({ name, example: Boolean(person.example) });
  }
  return found;
}

export function proficiencyLabels(rows: readonly ProficiencyRow[], catalog: readonly SkillLabelRow[]): string[] {
  const labels: string[] = [];
  const push = (label: string) => {
    const text = label.trim();
    if (!text || labels.includes(text)) return;
    labels.push(text);
  };
  for (const row of rows) {
    if (row.kind === "skill") {
      const id = resolveSkillId(row.optionId, catalog);
      const match = catalog.find((item) => item.id === id);
      if (match) push(skillOptionLabel(match));
      continue;
    }
    if (row.kind === "language") {
      push(languageLabel(row.optionId));
      continue;
    }
    if (row.kind === "weapon") {
      push(weaponLabel(row.optionId));
      continue;
    }
    if (row.kind === "tool" || row.kind === "instrument" || row.kind === "gaming") {
      push(toolLabel(row.optionId));
    }
  }
  return labels;
}
