import type {
  CultureBonus,
  KnowledgeSkill,
  LinkEnd,
  SessionLabel,
  SirathEntry,
  SirathSource,
  SirathView,
  StoryKind,
} from "./types";

const KIND_NOUN: Record<StoryKind, string> = {
  person: "someone you haven't identified",
  place: "a place you haven't learned",
  faction: "a group you haven't learned",
  thing: "something you haven't identified",
  event: "something you haven't learned",
  creature: "a creature you haven't identified",
};

const SKILL_LABEL: Record<KnowledgeSkill, string> = {
  history: "History",
  medicine: "Medicine",
  culture: "Culture",
  alchemy: "Alchemy",
  nature: "Nature",
  survival: "Survival",
};

const TOKEN = /\{\{([a-z0-9-]+)\|([^}]*)\}\}/g;

/** Drop unfinished notes. Players never see a TBD or placeholder field. */
export function forPlayer(value: string | null | undefined): string | null {
  if (!value) return null;
  const kept = value
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/\bTBD\b|placeholder/i.test(sentence))
    .join(" ")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!kept || /\bTBD\b|placeholder/i.test(kept)) return null;
  return kept;
}

export function cultureBonus(character: SirathSource["characters"][number], fact: SirathSource["facts"][number], rules: SirathSource["rules"]): CultureBonus | null {
  if (fact.skill !== "culture" || !fact.culture_id) return null;
  const bonus = rules.culture_bonus;
  const language = rules.culture_language[fact.culture_id];
  const own = character.cultures.includes(fact.culture_id) ? bonus.own_culture : 0;
  const knows = language && character.languages.some((item) => item.toLowerCase() === language.toLowerCase()) ? bonus.knows_language : 0;
  const total = bonus.stacks ? own + knows : Math.max(own, knows);
  return total ? { own_culture: own, knows_language: knows, total } : null;
}

/** The single gate for baseline and roll facts. Rolls of another skill never count. */
export function knowsFact(
  character: SirathSource["characters"][number],
  fact: SirathSource["facts"][number],
  rolls: Map<string, number>,
  rules: SirathSource["rules"],
): { how: "passive" | "roll"; bonus: CultureBonus | null } | null {
  if (!fact.skill || fact.dc == null) return null;
  const bonus = cultureBonus(character, fact, rules);
  const extra = bonus?.total ?? 0;
  const passive = character.passives[fact.skill] + extra;
  const roll = rolls.get(`${fact.entry_id}:${fact.skill}`);
  if (fact.tier === "baseline" && passive >= fact.dc) return { how: "passive", bonus };
  if (roll != null && roll + extra >= fact.dc) return { how: "roll", bonus };
  return null;
}

function sessionLabel(source: SirathSource, id: string | null): SessionLabel | null {
  if (!id) return null;
  const session = source.sessions.find((item) => item.id === id);
  if (!session) return null;
  const label = forPlayer(session.label) ?? "Session";
  return { id, label, date: forPlayer(session.date) };
}

/**
 * Player-safe book for one character. This is the fixture query path and the
 * reference for sirath_book(). Hidden names, ids, and aliases stay out.
 */
export function buildSirathView(source: SirathSource, characterId: string): SirathView | null {
  const character = source.characters.find((item) => item.id === characterId);
  if (!character) return null;
  const entries = new Map(source.entries.map((entry) => [entry.id, entry]));
  const squadId = character.squad_id;
  const mine = source.reveals.filter(
    (reveal) =>
      (reveal.scope === "squad" && reveal.scope_id === squadId) ||
      (reveal.scope === "character" && reveal.scope_id === character.id),
  );
  const entryReveals = new Map<string, SirathSource["reveals"]>();
  for (const reveal of mine) {
    if (!reveal.entry_id) continue;
    const list = entryReveals.get(reveal.entry_id) ?? [];
    list.push(reveal);
    entryReveals.set(reveal.entry_id, list);
  }
  const visible = new Set(entryReveals.keys());
  const factReveals = new Map(mine.filter((reveal) => reveal.fact_id).map((reveal) => [reveal.fact_id as string, reveal]));
  const rolls = new Map<string, number>();
  const rollSession = new Map<string, string>();
  for (const check of source.checks) {
    if (check.character_id !== character.id) continue;
    rollSession.set(check.entry_id, check.session_id);
    if (check.kind !== "roll") continue;
    const key = `${check.entry_id}:${check.skill}`;
    rolls.set(key, Math.max(rolls.get(key) ?? 0, check.total));
  }

  const opaque = new Map<string, string>();
  let counter = 0;
  const tokenFor = (entryId: string) => {
    const existing = opaque.get(entryId);
    if (existing) return existing;
    counter += 1;
    const token = `u${counter}`;
    opaque.set(entryId, token);
    return token;
  };
  const scrub = (text: string) =>
    forPlayer(
      text.replace(TOKEN, (_match, entryId: string, label: string) => {
        if (visible.has(entryId)) return `{{${entryId}|${label}}}`;
        const entry = entries.get(entryId);
        if (entry?.public_name) return `{{!plain|${label}}}`;
        const kind = entry?.kind ?? "thing";
        return `{{?${tokenFor(entryId)}|${kind}}}`;
      }),
    ) ?? "";

  const squadSessions = source.sessions.filter((session) => session.squad_id === squadId);
  const latest = squadSessions.length ? squadSessions[squadSessions.length - 1].id : null;
  const order = new Map(source.sessions.map((session, index) => [session.id, index]));
  const out: SirathEntry[] = [];
  const newIds: string[] = [];
  const checkNew: string[] = [];
  const sessionNew: string[] = [];

  for (const entry of source.entries) {
    if (!visible.has(entry.id) || entry.editorial_status !== "canon") continue;
    const facts = source.facts.filter((fact) => fact.entry_id === entry.id && fact.editorial_status === "canon");
    const tiers: SirathEntry["tiers"] = { common: [], recall: [], sealed: [], uncovered: [] };
    const aliases = [...entry.aliases];
    for (const fact of facts) {
      if (fact.tier === "common") {
        tiers.common.push({ id: fact.id, body: scrub(fact.body), pull_quote: forPlayer(fact.pull_quote) });
        aliases.push(...fact.adds_aliases);
      } else if (fact.tier === "baseline" || fact.tier === "roll") {
        const known = knowsFact(character, fact, rolls, source.rules);
        const skill = fact.skill as KnowledgeSkill;
        const label = SKILL_LABEL[skill];
        if (known) {
          tiers.recall.push({
            id: fact.id,
            body: scrub(fact.body),
            skill,
            skill_label: label,
            how: known.how,
            dc: fact.dc ?? 0,
            bonus: known.bonus,
            dc_is_placeholder: fact.dc_is_placeholder,
            pull_quote: forPlayer(fact.pull_quote),
          });
          aliases.push(...fact.adds_aliases);
        } else {
          tiers.sealed.push({
            skill,
            skill_label: label,
            dc: fact.dc ?? 0,
            dc_is_placeholder: fact.dc_is_placeholder,
            teaser: forPlayer(fact.teaser) || "More you might recall.",
            opens_by: fact.tier === "roll" ? `${label} roll` : `${label} roll (or a higher passive ${label})`,
          });
        }
      } else if (fact.tier === "discovery" && factReveals.has(fact.id)) {
        const reveal = factReveals.get(fact.id);
        tiers.uncovered.push({
          id: fact.id,
          body: scrub(fact.body),
          session: sessionLabel(source, reveal?.source_session_id ?? null),
          pull_quote: forPlayer(fact.pull_quote),
        });
        aliases.push(...fact.adds_aliases);
      }
    }
    const reveals = entryReveals.get(entry.id) ?? [];
    const meetings = reveals.filter((reveal) => reveal.source === "meeting");
    const last = meetings.length ? sessionLabel(source, meetings[meetings.length - 1].source_session_id) : null;
    const isNew =
      reveals.some((reveal) => reveal.source_session_id === latest) ||
      facts.some((fact) => factReveals.get(fact.id)?.source_session_id === latest) ||
      rollSession.get(entry.id) === latest;
    if (isNew && latest) newIds.push(entry.id);
    if (latest && rollSession.get(entry.id) === latest) checkNew.push(entry.id);
    if (
      latest &&
      (reveals.some((reveal) => reveal.source_session_id === latest) ||
        facts.some((fact) => factReveals.get(fact.id)?.source_session_id === latest))
    ) {
      sessionNew.push(entry.id);
    }
    const ranks = [
      ...reveals.map((reveal) => order.get(reveal.source_session_id ?? "") ?? 0),
      ...facts.filter((fact) => factReveals.has(fact.id)).map((fact) => order.get(factReveals.get(fact.id)?.source_session_id ?? "") ?? 0),
    ];
    if (rollSession.has(entry.id)) ranks.push(order.get(rollSession.get(entry.id) ?? "") ?? 0);
    const hintId = entry.faction_hint_entry_id;
    const hint = hintId && visible.has(hintId) ? entries.get(hintId) : null;
    out.push({
      id: entry.id,
      kind: entry.kind,
      display_name: entry.display_name,
      aliases: aliases.map((alias) => forPlayer(alias)).filter((alias): alias is string => Boolean(alias)),
      tags: entry.tags,
      hearsay: forPlayer(entry.hearsay) ?? "",
      voice_line: forPlayer(entry.voice_line) ?? "",
      image: entry.image,
      ward: forPlayer(entry.ward),
      faction_hint: hint ? { id: hint.id, name: hint.display_name } : null,
      chits: forPlayer(hintId ? (source.chits.held[squadId]?.[hintId] ?? null) : null),
      last_encounter: last,
      learned_rank: ranks.length ? Math.max(...ranks) : 0,
      tiers,
    });
  }

  const links: SirathView["links"] = [];
  for (const link of source.links) {
    if (link.dm_only || link.editorial_status !== "canon") continue;
    const left = link.from_entry_id;
    const right = link.to_entry_id;
    if (!visible.has(left) && !visible.has(right)) continue;
    const end = (entryId: string): LinkEnd => {
      const entry = entries.get(entryId);
      const kind = entry?.kind ?? "thing";
      if (visible.has(entryId) && entry) return { id: entryId, name: entry.display_name, kind };
      if (entry?.public_name) return { public_name: entry.display_name, kind };
      return { opaque: tokenFor(entryId), kind };
    };
    links.push({ from: end(left), to: end(right), label: link.label });
  }

  const home = source.squad_home[squadId];
  const lastSession = home?.last_session;
  const squad = source.squads.find((item) => item.id === squadId);
  return {
    viewer: {
      character_id: character.id,
      label: character.label,
      passive_history: character.passive_history,
      passives: character.passives,
      squad: squad?.label ?? "",
    },
    is_new_recruit: squadSessions.length === 0,
    entries: out,
    links,
    unknown_nouns: KIND_NOUN,
    home: {
      learned_count: out.length,
      latest_session: sessionLabel(source, latest),
      last_session: lastSession?.session_id
        ? {
            session: sessionLabel(source, lastSession.session_id) as SessionLabel,
            summary: forPlayer(lastSession.summary) ?? "",
          }
        : null,
      open_leads: (home?.open_leads ?? []).map((lead) => forPlayer(lead.text)).filter((lead): lead is string => Boolean(lead)),
      new_entry_ids: newIds,
      new_from_checkin_ids: checkNew,
      new_from_session_ids: sessionNew,
    },
    chit_note: source.chits.note,
  };
}
