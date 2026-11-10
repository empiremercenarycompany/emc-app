/** Columns read for a character at the table. No profile fields. */
export const DM_CHARACTER_COLUMNS =
  "id, name, class, level, profession_skill, background_skills, granted_skills, sheet";

export type AttendeeDraft = {
  id: string;
  name: string;
  classLabel: string;
  level: number;
  professionSkill: string | null;
  backgroundSkills: string[];
  grantedSkills: string[];
  recordedSkills: string[];
  proficiencyRows: { kind: string; optionId: string }[];
};

export type NpcDraft = {
  id: string;
  name: string;
  description: string;
  example: boolean;
  dmOnly: boolean;
  personality: string;
  voice: string;
  looks: string;
  encounters: string;
  secrets: string;
  banter: string[];
  proficiencies: { kind: string; optionId: string }[];
};

export type SessionChoice = { id: string; label: string; sessionDate: string | null };

export type NoteDraft = { id: string; body: string; createdAt: string };

export type LabelDraft = { id: string; displayName: string; defaultName: string | null };

export function rowsOf(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

export function relationMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "42P01" || code === "42703" || code === "PGRST204" || code === "PGRST205") return true;
  return /schema cache|could not find the table|does not exist/i.test(error.message ?? "");
}

export function skillsFromSheet(sheet: unknown): string[] {
  if (!sheet || typeof sheet !== "object" || Array.isArray(sheet)) return [];
  const skills = (sheet as { skills?: unknown }).skills;
  return stringList(skills);
}

export function classLabel(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "Not yet inducted";
}

/** Next session is the earliest date on or after today. Otherwise the latest earlier date. */
export function chosenSessionId(
  sessions: readonly { id: string; sessionDate?: string | null }[],
  param: string | undefined,
  today: string | null,
): string | null {
  if (param && sessions.some((session) => session.id === param)) return param;
  const dated = sessions.flatMap((session) => {
    const sessionDate = (session.sessionDate ?? "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(sessionDate) ? [{ id: session.id, sessionDate }] : [];
  });
  const day = (today ?? "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const upcoming = dated
      .filter((session) => session.sessionDate >= day)
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.id.localeCompare(b.id));
    if (upcoming.length > 0) return upcoming[0].id;
    const past = dated
      .filter((session) => session.sessionDate < day)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || a.id.localeCompare(b.id));
    if (past.length > 0) return past[0].id;
  }
  const latest = [...dated].sort(
    (a, b) => b.sessionDate.localeCompare(a.sessionDate) || a.id.localeCompare(b.id),
  );
  return latest[0]?.id ?? sessions[0]?.id ?? null;
}

export function parseSessions(rows: unknown[]): SessionChoice[] {
  const sessions: SessionChoice[] = [];
  for (const row of rows) {
    const record = recordOf(row);
    if (!record) continue;
    const id = text(record.id);
    const title = text(record.title);
    if (!id || !title) continue;
    const date = text(record.session_date).slice(0, 10);
    const squad = squadName(record.squads);
    const parts = [title];
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) parts.push(date);
    if (squad) parts.push(squad);
    sessions.push({
      id,
      label: parts.join(" · "),
      sessionDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    });
  }
  return sessions;
}

export function parseLabels(rows: unknown[]): LabelDraft[] {
  const labels: LabelDraft[] = [];
  for (const row of rows) {
    const record = recordOf(row);
    if (!record) continue;
    const id = text(record.id);
    if (!id) continue;
    labels.push({
      id,
      displayName: text(record.display_name),
      defaultName: text(record.default_name) || null,
    });
  }
  return labels;
}

export function mergeRoster(attendance: unknown[], muster: unknown[]): AttendeeDraft[] {
  const byId = new Map<string, AttendeeDraft>();
  for (const row of [...attendance, ...muster]) {
    const record = recordOf(row);
    if (!record) continue;
    const embedded = Array.isArray(record.characters) ? record.characters[0] : record.characters;
    const character = recordOf(embedded);
    if (!character) continue;
    const id = text(character.id);
    const name = text(character.name);
    if (!id || !name || byId.has(id)) continue;
    byId.set(id, {
      id,
      name,
      classLabel: classLabel(character.class),
      level: levelOf(character.level),
      professionSkill: text(character.profession_skill) || null,
      backgroundSkills: stringList(character.background_skills),
      grantedSkills: stringList(character.granted_skills),
      recordedSkills: skillsFromSheet(character.sheet),
      proficiencyRows: [],
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function addCharacterProficiencies(people: AttendeeDraft[], rows: unknown[]): AttendeeDraft[] {
  const extra = new Map<string, { kind: string; optionId: string }[]>();
  for (const row of rows) {
    const record = recordOf(row);
    if (!record) continue;
    const id = text(record.character_id);
    const kind = text(record.kind);
    const optionId = text(record.option_id);
    if (!id || !kind || !optionId) continue;
    const list = extra.get(id) ?? [];
    list.push({ kind, optionId });
    extra.set(id, list);
  }
  return people.map((person) => ({ ...person, proficiencyRows: extra.get(person.id) ?? [] }));
}

export function parseNpcs(rows: unknown[]): NpcDraft[] {
  const npcs: NpcDraft[] = [];
  for (const row of rows) {
    const record = recordOf(row);
    if (!record) continue;
    const id = text(record.id);
    const name = text(record.name);
    if (!id || !name) continue;
    npcs.push({
      id,
      name,
      description: text(record.summary),
      example: record.example === true,
      dmOnly: record.dm_only !== false,
      personality: "",
      voice: "",
      looks: "",
      encounters: "",
      secrets: "",
      banter: [],
      proficiencies: [],
    });
  }
  return npcs;
}

export function addNpcDetails(npcs: NpcDraft[], dossiers: unknown[], profs: unknown[]): NpcDraft[] {
  const dossierById = new Map<string, Record<string, unknown>>();
  for (const row of dossiers) {
    const record = recordOf(row);
    if (!record) continue;
    const id = text(record.entry_id);
    if (id) dossierById.set(id, record);
  }
  const profsById = new Map<string, { kind: string; optionId: string }[]>();
  for (const row of profs) {
    const record = recordOf(row);
    if (!record) continue;
    const id = text(record.entry_id);
    const kind = text(record.kind);
    const optionId = text(record.option_id);
    if (!id || !kind || !optionId) continue;
    const list = profsById.get(id) ?? [];
    list.push({ kind, optionId });
    profsById.set(id, list);
  }
  return npcs.map((npc) => {
    const dossier = dossierById.get(npc.id);
    const dossierClosed = dossier ? dossier.dm_only !== false : false;
    return {
      ...npc,
      dmOnly: npc.dmOnly || dossierClosed,
      personality: text(dossier?.personality),
      voice: text(dossier?.voice),
      looks: text(dossier?.looks),
      encounters: text(dossier?.encounters),
      secrets: text(dossier?.secrets),
      banter: stringList(dossier?.banter),
      proficiencies: profsById.get(npc.id) ?? [],
    };
  });
}

export function parseNotes(rows: unknown[]): NoteDraft[] {
  const notes: NoteDraft[] = [];
  for (const row of rows) {
    const record = recordOf(row);
    if (!record) continue;
    const id = text(record.id);
    const body = typeof record.body === "string" ? record.body.trim() : "";
    if (!id || !body) continue;
    notes.push({ id, body, createdAt: text(record.created_at) });
  }
  return notes;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed) out.push(trimmed);
  }
  return out;
}

function levelOf(value: unknown): number {
  const level = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(level) || level < 1 || level > 20) return 1;
  return level;
}

function squadName(value: unknown): string {
  const row = Array.isArray(value) ? value[0] : value;
  const record = recordOf(row);
  return record ? text(record.name) : "";
}
