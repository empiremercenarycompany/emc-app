import { beginnerHints } from "@/lib/rules/intake";
import { MISSING_ENV } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, CharacterRow, ScoringRow, SessionWindow, Viewer } from "@/lib/types";

const EMPTY: Viewer = {
  configured: false,
  userId: null,
  email: null,
  displayName: null,
  avatarUrl: null,
  role: null,
  guildId: null,
  canApproveLore: false,
  rank: null,
  character: null,
  config: null,
  today: null,
  session: null,
  week: null,
  beginner: false,
  intake: null,
};

export async function loadViewer(): Promise<Viewer> {
  const supabase = await createClient();
  if (!supabase) return EMPTY;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { ...EMPTY, configured: true };
  }

  const [profile, membership, character, config, todayResult, intakeResult] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, app_role, can_approve_lore").eq("id", user.id).maybeSingle(),
    supabase.from("guild_memberships").select("guild_id, rank").eq("user_id", user.id).maybeSingle(),
    supabase.from("characters").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("scoring_config").select("*").eq("id", 1).maybeSingle(),
    supabase.rpc("company_today"),
    supabase
      .from("player_intake")
      .select("dnd_experience, gym_experience, first_goals, timeslot_id, session_reminders")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const today = typeof todayResult.data === "string" ? todayResult.data : null;
  let session: SessionWindow | null = null;
  let week: number | null = null;
  if (today) {
    const [sessionResult, weekResult] = await Promise.all([
      supabase.rpc("adventure_session", { p_day: today }),
      supabase.rpc("adventure_week", { p_day: today }),
    ]);
    const row = Array.isArray(sessionResult.data) ? sessionResult.data[0] : null;
    if (row && typeof row.session_number === "number") {
      session = {
        session_number: row.session_number,
        start_date: String(row.start_date),
        end_date: String(row.end_date),
      };
    }
    week = typeof weekResult.data === "number" ? weekResult.data : null;
  }

  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);

  const intakeRow = intakeResult.error ? null : intakeResult.data;
  const intake = intakeRow
    ? {
        dnd: String(intakeRow.dnd_experience),
        gym: String(intakeRow.gym_experience),
        goals: Array.isArray(intakeRow.first_goals) ? intakeRow.first_goals.map(String) : [],
        timeslotId: intakeRow.timeslot_id ? String(intakeRow.timeslot_id) : null,
        reminders: Boolean(intakeRow.session_reminders),
      }
    : null;

  return {
    configured: true,
    userId: user.id,
    email: user.email ?? null,
    displayName: profile.data?.display_name ?? null,
    avatarUrl: profile.data?.avatar_url ?? null,
    role: (profile.data?.app_role as AppRole | undefined) ?? "player",
    guildId: membership.data?.guild_id ?? null,
    canApproveLore: Boolean(profile.data?.can_approve_lore),
    rank: membership.data?.rank ?? null,
    character: (character.data as CharacterRow | null) ?? null,
    config: (config.data as ScoringRow | null) ?? null,
    today,
    session,
    week,
    beginner: beginnerHints(intake ? { dnd: intake.dnd, gym: intake.gym } : null),
    intake,
  };
}

export function setupMessage(viewer: Viewer): string | null {
  if (!viewer.configured) return MISSING_ENV;
  return null;
}
