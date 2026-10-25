export type AppRole = "player" | "dm" | "admin" | "curator";

export type CharacterRow = {
  id: string;
  user_id: string;
  guild_id: string | null;
  squad_id: string | null;
  name: string;
  species: string | null;
  profession: string | null;
  profession_tool: string | null;
  profession_skill: string | null;
  origin_word: string | null;
  class: string | null;
  level: number;
  rank: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  physical_points: number;
  constitution_points: number;
  mental_points: number;
  inducted_at: string | null;
  notes: string | null;
};

export type ScoringRow = {
  time_zone: string;
  cohort_start: string;
  backfill_days: number;
  goal_backfill_days: number;
  points_per_prescribed_workout: number;
  points_per_custom_workout: number;
  points_per_lifting_session: number;
  points_per_goal: number;
  exercise_points_per_session: number;
  goal_points_per_session: number;
  session_length_days: number;
  first_adventure_sessions: number;
  point_buy_budget: number;
  point_buy_max: number;
  squad_max_size: number;
  award_requires_approval: boolean;
  log_visibility: string;
  induction_week: number;
  adventure_weeks: number;
  level_after_adventure_1: number;
  level_after_adventure_2: number;
  veteran_tier_start_week: number | null;
  share_lifting_default: boolean;
};

export type SessionWindow = {
  session_number: number;
  start_date: string;
  end_date: string;
};

export type Affordable = {
  ability: string;
  from: number;
  to: number;
  cost: number;
  pool: string;
};

export type Impact = {
  kind?: string;
  log_id?: string;
  points_delta?: number;
  pool?: string | null;
  status?: string;
  build_total?: number;
  replayed?: boolean;
  unspent_after?: {
    physical: number;
    constitution: number;
    mental: number;
  };
  affordable_increases?: Affordable[];
  scores?: Record<string, number>;
  objective_progress?: {
    objective_id?: string;
    current_value?: number;
    target_value?: number | null;
  } | null;
};

export type ActionResult = { error: string } | { impact: Impact } | { ok: true };

export type Viewer = {
  configured: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  role: AppRole | null;
  guildId: string | null;
  rank: string | null;
  character: CharacterRow | null;
  config: ScoringRow | null;
  today: string | null;
  session: SessionWindow | null;
  week: number | null;
};

export function isStaff(role: AppRole | null): boolean {
  return role === "dm" || role === "admin" || role === "curator";
}

export function isLibraryEditor(role: AppRole | null): boolean {
  return role === "admin" || role === "curator";
}
