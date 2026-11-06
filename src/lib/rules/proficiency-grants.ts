import { ARTISAN_TOOLS, GAMING_SETS, TOOL_LABELS, backgroundById } from "./backgrounds";
import { GREW_UP_INSTRUMENTS, GREW_UP_LANGUAGES } from "./grew-up";
import { SHEET_SKILLS } from "./sheet";
import { skillLabel } from "./skill-names";

/**
 * Creation-time proficiency grants. Ids and names only. No rules text.
 * Skilled chooses three skills or tools. Crafter chooses three artisan's tools
 * from the fast-crafting list. Tavern Brawler adds improvised weapons.
 * Human chooses one skill. Elf chooses Insight, Perception, or Survival.
 * The other recruitment feats and species add none.
 */

const CHOOSE_SKILLED = "Choose three skills or tools.";
const CHOOSE_CRAFTER = "Choose three artisan's tools.";
const CHOOSE_SKILL = "Choose one skill.";
const ALREADY = "Choose a proficiency you do not already have.";
const FROM_LIST = "Choose a proficiency from the list.";
const FEAT_NONE = "That feat has no proficiency to choose.";
const SPECIES_NONE = "That people has no proficiency to choose.";
const LEAVE_OPEN = "Leave a skill open. Those are already on your papers.";
const CHOOSE_TOOL = "Choose a tool this background allows.";
const CHOOSE_PAST = "Choose your past.";

export const ELF_SKILL_IDS = ["insight", "perception", "survival"] as const;

/** Artisan's tools named for Crafter. Not every artisan's tool. */
export const CRAFTER_TOOL_IDS = [
  "carpenter",
  "leatherworker",
  "mason",
  "potter",
  "smith",
  "tinker",
  "weaver",
  "woodcarver",
] as const;

const KIT_TOOL_IDS = ["disguise", "forgery", "herbalism", "navigator", "poisoner", "thieves"] as const;

export const SKILLED_TOOL_IDS = [
  ...ARTISAN_TOOLS,
  ...KIT_TOOL_IDS,
  ...GAMING_SETS,
  ...GREW_UP_INSTRUMENTS.map(([id]) => id),
] as const;

const SKILL_IDS = SHEET_SKILLS.map((skill) => skill.id);

const INSTRUMENT_LABELS = Object.fromEntries(GREW_UP_INSTRUMENTS) as Record<string, string>;
const LANGUAGE_LABELS = Object.fromEntries(GREW_UP_LANGUAGES) as Record<string, string>;
const EXTRA_TOOL_LABELS: Record<string, string> = {
  disguise: "Disguise kit",
  poisoner: "Poisoner's kit",
};
const WEAPON_LABELS: Record<string, string> = {
  improvised: "Improvised weapons",
};

const CHOICE_FEATS = new Set(["Skilled", "Crafter"]);
const AUTOMATIC_FEATS = new Set(["Tavern Brawler"]);
const PLAIN_FEATS = new Set(["Alert", "Healer", "Lucky", "Savage Attacker", "Tough"]);

export type ProficiencyGroup = "Skills" | "Tools";

export type ProficiencyOption = {
  token: string;
  id: string;
  label: string;
  group: ProficiencyGroup;
};

export type ProficiencyChoice = {
  key: "feat" | "species";
  prompt: string;
  count: number;
  options: ProficiencyOption[];
};

export type GrantInput = {
  backgroundId: string;
  speciesId: string;
  toolId: string;
  featPicks: string[];
  speciesPick: string;
};

export type GrantColumns = {
  profession_skill?: string | null;
  profession_tool?: string | null;
  background_skills?: string[] | null;
  granted_skills?: string[] | null;
  granted_tools?: string[] | null;
  granted_languages?: string[] | null;
  granted_weapons?: string[] | null;
};

export type ResolvedGrants = {
  skills: string[];
  tools: string[];
  languages: string[];
  weapons: string[];
};

type ParsedToken = { kind: "skill" | "tool" | "language" | "weapon"; id: string };

export function creationChoices(input: {
  backgroundId: string;
  speciesId: string;
  toolId: string;
  featPicks: string[];
}): ProficiencyChoice[] {
  const background = backgroundById(input.backgroundId);
  if (!background) return [];
  const owned = ownedTokens(background.skills, input.toolId);
  const choices: ProficiencyChoice[] = [];
  if (background.feat === "Skilled") {
    choices.push({
      key: "feat",
      prompt: CHOOSE_SKILLED,
      count: 3,
      options: [...skillOptions(), ...skilledToolOptions()].filter((option) => !owned.has(option.token)),
    });
  } else if (background.feat === "Crafter") {
    choices.push({
      key: "feat",
      prompt: CHOOSE_CRAFTER,
      count: 3,
      options: crafterOptions().filter((option) => !owned.has(option.token)),
    });
  }
  const taken = new Set(owned);
  for (const pick of input.featPicks) {
    if (pick) taken.add(pick);
  }
  if (input.speciesId === "human") {
    choices.push({
      key: "species",
      prompt: CHOOSE_SKILL,
      count: 1,
      options: skillOptions().filter((option) => !taken.has(option.token)),
    });
  } else if (input.speciesId === "elf") {
    choices.push({
      key: "species",
      prompt: CHOOSE_SKILL,
      count: 1,
      options: skillOptions().filter(
        (option) =>
          (ELF_SKILL_IDS as readonly string[]).includes(option.id) && !taken.has(option.token),
      ),
    });
  }
  return choices;
}

export function grantPicksMissing(input: GrantInput, scope: "all" | "feat" | "species" = "all"): string[] {
  const feat = scope === "species" ? [] : featProblems(input);
  const species = scope === "feat" ? [] : speciesProblems(input);
  return [...feat, ...species];
}

export function resolveCreationGrants(input: GrantInput): { ok: true } & ResolvedGrants | { ok: false; missing: string[] } {
  const missing = grantPicksMissing(input);
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, ...collectGrants(input) };
}

export function automaticGrantLabels(feat: string): string[] {
  return feat === "Tavern Brawler" ? [weaponLabel("improvised")] : [];
}

export function grantLabel(token: string): string {
  const parsed = parseToken(token);
  if (!parsed) return token;
  if (parsed.kind === "skill") return skillLabel(parsed.id);
  if (parsed.kind === "tool") return toolLabel(parsed.id);
  if (parsed.kind === "language") return languageLabel(parsed.id);
  return weaponLabel(parsed.id);
}

export function toolLabel(id: string): string {
  return TOOL_LABELS[id] ?? EXTRA_TOOL_LABELS[id] ?? INSTRUMENT_LABELS[id] ?? id;
}

export function weaponLabel(id: string): string {
  return WEAPON_LABELS[id] ?? id;
}

export function languageLabel(id: string): string {
  return LANGUAGE_LABELS[id] ?? id;
}

export function characterSkillIds(row: GrantColumns): string[] {
  return unique([
    ...(row.profession_skill ? [row.profession_skill] : []),
    ...(row.background_skills ?? []),
    ...(row.granted_skills ?? []),
  ]);
}

export function alsoTrainedLabels(row: GrantColumns): string[] {
  const tools = unique(
    [row.profession_tool, ...(row.granted_tools ?? [])].filter((id): id is string => Boolean(id)),
  );
  return [
    ...tools.map((id) => toolLabel(id)),
    ...(row.granted_languages ?? []).map((id) => languageLabel(id)),
    ...(row.granted_weapons ?? []).map((id) => weaponLabel(id)),
  ];
}

export function proficiencyRecord(row: GrantColumns): {
  skills: string;
  tools: string;
  languages: string;
  weapons: string;
} {
  return {
    skills: characterSkillIds(row)
      .map((id) => skillLabel(id))
      .join(", "),
    tools: unique(
      [row.profession_tool, ...(row.granted_tools ?? [])].filter((id): id is string => Boolean(id)),
    )
      .map((id) => toolLabel(id))
      .join(", "),
    languages: (row.granted_languages ?? []).map((id) => languageLabel(id)).join(", "),
    weapons: (row.granted_weapons ?? []).map((id) => weaponLabel(id)).join(", "),
  };
}

export function featsThatGrantProficiencies(): { choice: string[]; automatic: string[]; plain: string[] } {
  return {
    choice: [...CHOICE_FEATS],
    automatic: [...AUTOMATIC_FEATS],
    plain: [...PLAIN_FEATS],
  };
}

function featProblems(input: GrantInput): string[] {
  const background = backgroundById(input.backgroundId);
  if (!background) return [CHOOSE_PAST];
  if (!background.tools.includes(input.toolId)) return [CHOOSE_TOOL];
  const owned = ownedTokens(background.skills, input.toolId);
  const picks = filled(input.featPicks);
  if (background.feat === "Skilled") return choiceProblems(picks, 3, CHOOSE_SKILLED, owned, skilledAllowed);
  if (background.feat === "Crafter") return choiceProblems(picks, 3, CHOOSE_CRAFTER, owned, crafterAllowed);
  if (picks.length > 0) return [FEAT_NONE];
  return [];
}

function speciesProblems(input: GrantInput): string[] {
  if (!input.speciesId) return [];
  const background = backgroundById(input.backgroundId);
  const owned = background ? ownedTokens(background.skills, input.toolId) : new Set<string>();
  const taken = new Set(owned);
  for (const pick of filled(input.featPicks)) taken.add(pick);
  const pick = input.speciesPick.trim();
  if (input.speciesId === "human" || input.speciesId === "elf") {
    const options =
      input.speciesId === "elf"
        ? skillOptions().filter(
            (option) =>
              (ELF_SKILL_IDS as readonly string[]).includes(option.id) && !taken.has(option.token),
          )
        : skillOptions().filter((option) => !taken.has(option.token));
    if (options.length === 0) return [LEAVE_OPEN];
    if (!pick) return [CHOOSE_SKILL];
    if (!options.some((option) => option.token === pick)) {
      return [taken.has(pick) ? ALREADY : FROM_LIST];
    }
    return [];
  }
  if (pick) return [SPECIES_NONE];
  return [];
}

function choiceProblems(
  picks: string[],
  count: number,
  countMessage: string,
  owned: Set<string>,
  allowed: (parsed: ParsedToken) => boolean,
): string[] {
  if (picks.length !== count) return [countMessage];
  const seen = new Set<string>();
  for (const pick of picks) {
    const parsed = parseToken(pick);
    if (!parsed || !allowed(parsed)) return [FROM_LIST];
    if (owned.has(pick) || seen.has(pick)) return [ALREADY];
    seen.add(pick);
  }
  return [];
}

function collectGrants(input: GrantInput): ResolvedGrants {
  const background = backgroundById(input.backgroundId);
  const skills: string[] = [];
  const tools: string[] = [];
  const languages: string[] = [];
  const weapons: string[] = background?.feat === "Tavern Brawler" ? ["improvised"] : [];
  for (const pick of [...filled(input.featPicks), input.speciesPick.trim()].filter(Boolean)) {
    const parsed = parseToken(pick);
    if (!parsed) continue;
    if (parsed.kind === "skill") skills.push(parsed.id);
    else if (parsed.kind === "tool") tools.push(parsed.id);
    else if (parsed.kind === "language") languages.push(parsed.id);
    else weapons.push(parsed.id);
  }
  return { skills, tools, languages, weapons };
}

function skilledAllowed(parsed: ParsedToken): boolean {
  if (parsed.kind === "skill") return SKILL_IDS.includes(parsed.id);
  if (parsed.kind === "tool") return (SKILLED_TOOL_IDS as readonly string[]).includes(parsed.id);
  return false;
}

function crafterAllowed(parsed: ParsedToken): boolean {
  return parsed.kind === "tool" && (CRAFTER_TOOL_IDS as readonly string[]).includes(parsed.id);
}

function skillOptions(): ProficiencyOption[] {
  return SKILL_IDS.map((id) => ({
    token: `skill:${id}`,
    id,
    label: skillLabel(id),
    group: "Skills",
  }));
}

function skilledToolOptions(): ProficiencyOption[] {
  return SKILLED_TOOL_IDS.map((id) => ({
    token: `tool:${id}`,
    id,
    label: toolLabel(id),
    group: "Tools",
  }));
}

function crafterOptions(): ProficiencyOption[] {
  return CRAFTER_TOOL_IDS.map((id) => ({
    token: `tool:${id}`,
    id,
    label: toolLabel(id),
    group: "Tools",
  }));
}

function ownedTokens(skills: readonly string[], toolId: string): Set<string> {
  const owned = new Set(skills.map((id) => `skill:${id}`));
  if (toolId) owned.add(`tool:${toolId}`);
  return owned;
}

function filled(picks: string[]): string[] {
  return picks.map((pick) => pick.trim()).filter(Boolean);
}

function parseToken(token: string): ParsedToken | null {
  const match = /^(skill|tool|language|weapon):([a-z0-9_]+)$/.exec(token.trim());
  if (!match) return null;
  return { kind: match[1] as ParsedToken["kind"], id: match[2] };
}

function unique(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
