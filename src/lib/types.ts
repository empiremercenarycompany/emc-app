export type AppRole = "player" | "dm" | "admin" | "curator" | "approver";

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
  background_id?: string | null;
  background_skills?: string[] | null;
  origin_feat?: string | null;
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
  social_points?: number;
  free_points?: number;
  share_logs?: boolean;
  inducted_at: string | null;
  notes: string | null;
  sheet?: {
    hp?: number;
    ac?: number;
    speed?: number;
    saves?: string[];
    skills?: string[];
    attacks?: string[];
    features?: string[];
    spells?: string[];
    feats?: string[];
    lineage?: string;
  } | null;
  seed_flags?: string[] | null;
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
  level_two_week: number;
  level_three_week: number;
  attendance_loot: string;
  group_goal_payout: string;
  veteran_tier_start_week: number | null;
  share_lifting_default: boolean;
  weekly_point_cap?: number;
  pool_point_cap?: number;
  attendance_points?: number;
  muster_week?: number;
  posters_launch?: string | null;
  location_address?: string | null;
  price_member_cents?: number | null;
  price_nonmember_cents?: number | null;
  discord_enabled?: boolean;
  discord_auth_enabled?: boolean;
  google_auth_enabled?: boolean;
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
    social?: number;
    free?: number;
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
  canApproveLore: boolean;
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

export function isLogApprover(role: AppRole | null): boolean {
  return isStaff(role) || role === "approver";
}

export function isLibraryEditor(role: AppRole | null): boolean {
  return role === "admin" || role === "curator";
}
