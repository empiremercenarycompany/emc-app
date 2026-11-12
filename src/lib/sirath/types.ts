/** Player-safe Sirath shapes. The Sirath is the name in the UI. Tables stay story_*. */

export const KNOWLEDGE_SKILLS = ["history", "medicine", "culture", "alchemy", "nature", "survival"] as const;

export type KnowledgeSkill = (typeof KNOWLEDGE_SKILLS)[number];

export type StoryKind = "person" | "place" | "faction" | "thing" | "event" | "creature";

export type CultureBonus = {
  own_culture: number;
  knows_language: number;
  total: number;
};

export type SessionLabel = {
  id: string;
  label: string;
  date: string | null;
};

export type LinkEnd =
  | { id: string; name: string; kind: StoryKind }
  | { public_name: string; kind: StoryKind }
  | { opaque: string; kind: StoryKind };

export type SirathFactCommon = {
  id: string;
  body: string;
  pull_quote: string | null;
};

export type SirathFactRecall = SirathFactCommon & {
  skill: KnowledgeSkill;
  skill_label: string;
  how: "passive" | "roll";
  dc: number;
  bonus: CultureBonus | null;
  dc_is_placeholder: boolean;
};

export type SirathFactSealed = {
  skill: KnowledgeSkill;
  skill_label: string;
  dc: number;
  dc_is_placeholder: boolean;
  teaser: string;
  opens_by: string;
};

export type SirathFactUncovered = SirathFactCommon & {
  session: SessionLabel | null;
};

export type SirathEntry = {
  id: string;
  kind: StoryKind;
  display_name: string;
  aliases: string[];
  tags: string[];
  hearsay: string;
  voice_line: string;
  image: {
    src: string;
    alt: string;
    kind: string;
    likeness: boolean;
    credit?: string;
  } | null;
  ward: string | null;
  faction_hint: { id: string; name: string } | null;
  chits: string | null;
  last_encounter: SessionLabel | null;
  learned_rank: number;
  tiers: {
    common: SirathFactCommon[];
    recall: SirathFactRecall[];
    sealed: SirathFactSealed[];
    uncovered: SirathFactUncovered[];
  };
};

export type SirathView = {
  viewer: {
    character_id: string;
    label: string;
    passive_history: number;
    passives: Record<KnowledgeSkill, number>;
    squad: string;
  };
  is_new_recruit: boolean;
  entries: SirathEntry[];
  links: { from: LinkEnd; to: LinkEnd; label: string }[];
  unknown_nouns: Record<StoryKind, string>;
  home: {
    learned_count: number;
    latest_session: SessionLabel | null;
    last_session: { session: SessionLabel; summary: string } | null;
    open_leads: string[];
    new_entry_ids: string[];
    new_from_checkin_ids: string[];
    new_from_session_ids: string[];
  };
  chit_note: string;
};

export type SirathSource = {
  rules: {
    skills: KnowledgeSkill[];
    passive_formula: string;
    culture_bonus: {
      own_culture: number;
      knows_language: number;
      stacks: boolean;
      decided?: string;
    };
    culture_language: Record<string, string>;
  };
  characters: {
    id: string;
    squad_id: string;
    label: string;
    skill_mods: Record<KnowledgeSkill, number>;
    passives: Record<KnowledgeSkill, number>;
    passive_history: number;
    cultures: string[];
    languages: string[];
  }[];
  squads: { id: string; guild_id: string; label: string }[];
  sessions: { id: string; squad_id?: string; label: string; date: string | null }[];
  entries: {
    id: string;
    kind: StoryKind;
    display_name: string;
    aliases: string[];
    tags: string[];
    hearsay: string;
    voice_line: string;
    image: SirathEntry["image"];
    faction_hint_entry_id: string | null;
    ward: string | null;
    editorial_status: string;
    public_name?: boolean;
    public_name_basis?: string;
    canon_refs?: string[];
  }[];
  facts: {
    id: string;
    entry_id: string;
    tier: "common" | "baseline" | "roll" | "discovery";
    skill: KnowledgeSkill | null;
    culture_id: string | null;
    dc: number | null;
    dc_is_placeholder: boolean;
    teaser: string | null;
    body: string;
    pull_quote: string | null;
    adds_aliases: string[];
    editorial_status: string;
    canon_ref?: string;
    skill_tag_reason?: string | null;
  }[];
  links: {
    id: string;
    from_entry_id: string;
    to_entry_id: string;
    link_type: string;
    label: string;
    editorial_status: string;
    dm_only?: boolean;
  }[];
  reveals: {
    scope: "character" | "squad";
    scope_id: string;
    entry_id: string | null;
    fact_id: string | null;
    link_id?: string | null;
    source: string;
    skill?: KnowledgeSkill | null;
    source_session_id: string | null;
    revealed_by?: string;
    revealed_at?: string | null;
  }[];
  checks: {
    character_id: string;
    entry_id: string;
    session_id: string;
    kind: "passive" | "roll";
    skill: KnowledgeSkill;
    total: number;
  }[];
  squad_home: Record<
    string,
    {
      last_session: { session_id: string; summary: string } | null;
      open_leads: { text: string; ref?: string }[];
    }
  >;
  chits: { note: string; held: Record<string, Record<string, string>> };
};
