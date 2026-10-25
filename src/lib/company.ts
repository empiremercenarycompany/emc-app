import { MISSING_ENV } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, CharacterRow, ScoringRow, SessionWindow, Viewer } from "@/lib/types";

const EMPTY: Viewer = {
  configured: false,
  userId: null,
  email: null,
  displayName: null,
  role: null,
  guildId: null,
  rank: null,
  character: null,
  config: null,
  today: null,
  session: null,
  week: null,
};

export async function loadViewer(): Promise<Viewer> {
  const supabase = await createClient();
  if (!supabase) return EMPTY;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { ...EMPTY, configured: true };
  }

  const [profile, membership, character, config, todayResult] = await Promise.all([
    supabase.from("profiles").select("display_name, app_role").eq("id", user.id).maybeSingle(),
    supabase.from("guild_memberships").select("guild_id, rank").eq("user_id", user.id).maybeSingle(),
    supabase.from("characters").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("scoring_config").select("*").eq("id", 1).maybeSingle(),
    supabase.rpc("company_today"),
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

  return {
    configured: true,
    userId: user.id,
    email: user.email ?? null,
    displayName: profile.data?.display_name ?? null,
    role: (profile.data?.app_role as AppRole | undefined) ?? "player",
    guildId: membership.data?.guild_id ?? null,
    rank: membership.data?.rank ?? null,
    character: (character.data as CharacterRow | null) ?? null,
    config: (config.data as ScoringRow | null) ?? null,
    today,
    session,
    week,
  };
}

export function setupMessage(viewer: Viewer): string | null {
  if (!viewer.configured) return MISSING_ENV;
  return null;
}
