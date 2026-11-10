import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addCharacterProficiencies,
  addNpcDetails,
  chosenSessionId,
  DM_CHARACTER_COLUMNS,
  mergeRoster,
  parseLabels,
  parseNotes,
  parseNpcs,
  parseSessions,
  relationMissing,
  rowsOf,
  type NpcDraft,
} from "@/lib/dm/model";
import {
  proficientAtTable,
  proficiencyLabels,
  resolveSkillId,
  skillCatalog,
  skillOptionLabel,
  skillsForPicker,
  type TablePerson,
} from "@/lib/rules/table-proficiency";

export type DmTable = {
  sessions: { id: string; label: string }[];
  sessionsFailed: boolean;
  sessionId: string;
  skills: { id: string; label: string }[];
  skillId: string;
  skillLabel: string;
  attendees: { id: string; name: string; classLabel: string; level: number }[];
  rosterFailed: boolean;
  proficient: { name: string; example: boolean }[];
  npcProficient: { name: string; example: boolean }[];
  npcs: {
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
    trained: string[];
  }[];
  npcState: "ready" | "missing" | "failed";
  notes: { id: string; body: string; createdAt: string }[];
  notesFailed: boolean;
};

const CHARACTER_EMBED = `character_id, characters(${DM_CHARACTER_COLUMNS})`;

export async function loadDmTable(
  supabase: SupabaseClient,
  guildId: string,
  sessionParam: string | undefined,
  skillParam: string | undefined,
  today: string | null,
): Promise<DmTable> {
  const [sessionsResult, labelsResult, entriesResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title, session_date, squads(name)")
      .eq("guild_id", guildId)
      .order("session_date", { ascending: false, nullsFirst: false }),
    supabase.from("skill_labels").select("id, display_name, default_name"),
    supabase
      .from("glossary_entries")
      .select("id, name, summary, example, dm_only")
      .eq("guild_id", guildId)
      .eq("kind", "npc")
      .order("name"),
  ]);

  const sessionsFailed = Boolean(sessionsResult.error);
  const sessions = sessionsFailed ? [] : parseSessions(rowsOf(sessionsResult.data));
  const sessionId = chosenSessionId(sessions, sessionParam, today) ?? "";
  const catalog = skillCatalog(labelsResult.error ? [] : parseLabels(rowsOf(labelsResult.data)));
  const picker = skillsForPicker(catalog);
  const skillId = skillParam ? resolveSkillId(skillParam, catalog) ?? "" : "";
  const selected = picker.find((skill) => skill.id === skillId);

  let npcState = npcLoadState(entriesResult.error);
  let npcs: NpcDraft[] = npcState === "ready" ? parseNpcs(rowsOf(entriesResult.data)) : [];
  if (npcState === "ready" && npcs.length > 0) {
    const ids = npcs.map((npc) => npc.id);
    const [dossiersResult, profsResult] = await Promise.all([
      supabase
        .from("glossary_dossiers")
        .select("entry_id, personality, voice, looks, encounters, secrets, banter, dm_only")
        .in("entry_id", ids),
      supabase.from("npc_proficiencies").select("entry_id, kind, option_id").in("entry_id", ids),
    ]);
    const dossierMissing = relationMissing(dossiersResult.error);
    const profMissing = relationMissing(profsResult.error);
    if ((dossiersResult.error && !dossierMissing) || (profsResult.error && !profMissing)) {
      npcs = [];
      npcState = "failed";
    } else {
      npcs = addNpcDetails(
        npcs,
        dossiersResult.error ? [] : rowsOf(dossiersResult.data),
        profsResult.error ? [] : rowsOf(profsResult.data),
      );
    }
  }

  let attendees: DmTable["attendees"] = [];
  let rosterFailed = sessionsFailed;
  let people = mergeRoster([], []);
  let notes: DmTable["notes"] = [];
  let notesFailed = false;

  if (sessionId) {
    const [attendanceResult, musterResult, notesResult] = await Promise.all([
      supabase.from("session_attendance").select(CHARACTER_EMBED).eq("session_id", sessionId),
      supabase.from("table_muster").select(CHARACTER_EMBED).eq("session_id", sessionId),
      supabase
        .from("dm_notes")
        .select("id, body, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    const attendanceRows = attendanceResult.error ? null : rowsOf(attendanceResult.data);
    const musterRows = musterResult.error ? null : rowsOf(musterResult.data);
    if (!attendanceRows && !musterRows) {
      rosterFailed = true;
    } else {
      people = mergeRoster(attendanceRows ?? [], musterRows ?? []);
      if (people.length > 0) {
        const profs = await supabase
          .from("character_proficiencies")
          .select("character_id, kind, option_id")
          .in(
            "character_id",
            people.map((person) => person.id),
          );
        if (!profs.error) people = addCharacterProficiencies(people, rowsOf(profs.data));
      }
      attendees = people.map((person) => ({
        id: person.id,
        name: person.name,
        classLabel: person.classLabel,
        level: person.level,
      }));
    }
    if (notesResult.error) notesFailed = true;
    else notes = parseNotes(rowsOf(notesResult.data));
  }

  const tablePeople: TablePerson[] = people.map((person) => ({
    name: person.name,
    professionSkill: person.professionSkill,
    backgroundSkills: person.backgroundSkills,
    grantedSkills: person.grantedSkills,
    recordedSkills: person.recordedSkills,
    proficiencyRows: person.proficiencyRows,
  }));
  const npcPeople: TablePerson[] = npcs.map((npc) => ({
    name: npc.name,
    example: npc.example,
    proficiencyRows: npc.proficiencies,
  }));

  return {
    sessions: sessions.map((session) => ({ id: session.id, label: session.label })),
    sessionsFailed,
    sessionId,
    skills: picker.map((skill) => ({ id: skill.id, label: skillOptionLabel(skill) })),
    skillId,
    skillLabel: selected ? skillOptionLabel(selected) : "",
    attendees,
    rosterFailed,
    proficient: skillId ? proficientAtTable(skillId, tablePeople, catalog) : [],
    npcProficient: skillId ? proficientAtTable(skillId, npcPeople, catalog) : [],
    npcs: npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      description: npc.description,
      example: npc.example,
      dmOnly: npc.dmOnly,
      personality: npc.personality,
      voice: npc.voice,
      looks: npc.looks,
      encounters: npc.encounters,
      secrets: npc.secrets,
      banter: npc.banter,
      trained: proficiencyLabels(npc.proficiencies, catalog),
    })),
    npcState,
    notes,
    notesFailed,
  };
}

function npcLoadState(error: { code?: string; message?: string } | null): DmTable["npcState"] {
  if (!error) return "ready";
  return relationMissing(error) ? "missing" : "failed";
}
