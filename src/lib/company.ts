import { after } from "next/server";
import { cache } from "react";
import { recordVisit } from "@/lib/notify/record-visit";
import { shouldNotifyNewAccount } from "@/lib/notify/signup-notice";
import { noticeFields, type SignupRecord } from "@/lib/notify/signup-fields";
import { beginnerHints, displaySlot, dndLabel, gymLabel } from "@/lib/rules/intake";
import { tableLabel } from "@/lib/rules/saturday-tables";
import { gymMemberLabel, parseGymMember } from "@/lib/rules/public-copy";
import { MISSING_ENV } from "@/lib/supabase/env";
import { createClient, createClientWithAccessToken } from "@/lib/supabase/server";
import type { AppRole, CharacterRow, ScoringRow, SessionWindow, Viewer } from "@/lib/types";

const INTAKE_MEMBER =
  "dnd_experience, gym_experience, first_goals, timeslot_id, session_reminders, phone, species_idea, class_idea, backstory_idea, fitness_experience, age_band, teen_waitlist, gym_member, gym_membership_number, membership_verified, checkout_plan, signup_src";
const INTAKE_TABLE =
  `${INTAKE_MEMBER}, preferred_squad_id, table_starts_on, table_request, any_open_table, with_friend, friend_name`;
const INTAKE_FULL =
  "dnd_experience, gym_experience, first_goals, timeslot_id, session_reminders, phone, species_idea, class_idea, backstory_idea, fitness_experience, age_band, teen_waitlist";
const INTAKE_BASE = "dnd_experience, gym_experience, first_goals, timeslot_id, session_reminders";
const PROFILE_WITH_NOTICE =
  "display_name, avatar_url, app_role, can_approve_lore, last_seen_at, created_at, signup_notified_at";
const PROFILE_BASE = "display_name, avatar_url, app_role, can_approve_lore, last_seen_at, created_at";

function missingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .+ does not exist/i.test(error.message ?? "");
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function sessionRoleLabel(role: AppRole | null, canApproveLore: boolean): string | null {
  if (canApproveLore) return "Curator";
  if (role === "dm") return "DM";
  if (role === "admin") return "Admin";
  if (role === "curator") return "Curator";
  return null;
}

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
  firstVisit: true,
  intake: null,
};

/**
 * One viewer load per request. The layout and the page were each waiting on
 * auth, the profile reads, and a last-seen write, which stacked up on the
 * hop from Continue to home.
 */
export const loadViewer = cache(loadViewerOnce);

async function loadViewerOnce(): Promise<Viewer> {
  const supabase = await createClient();
  if (!supabase) return EMPTY;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { ...EMPTY, configured: true };
  }

  const [profileResult, membership, character, config, todayResult, intakeResult] = await Promise.all([
    supabase.from("profiles").select(PROFILE_WITH_NOTICE).eq("id", user.id).maybeSingle(),
    supabase.from("guild_memberships").select("guild_id, rank").eq("user_id", user.id).maybeSingle(),
    supabase.from("characters").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("scoring_config").select("*").eq("id", 1).maybeSingle(),
    supabase.rpc("company_today"),
    supabase.from("player_intake").select(INTAKE_TABLE).eq("user_id", user.id).maybeSingle(),
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

  let intakeQuery = intakeResult;
  if (missingColumn(intakeQuery.error)) {
    intakeQuery = await supabase.from("player_intake").select(INTAKE_FULL).eq("user_id", user.id).maybeSingle();
  }
  if (missingColumn(intakeQuery.error)) {
    intakeQuery = await supabase.from("player_intake").select(INTAKE_BASE).eq("user_id", user.id).maybeSingle();
  }
  const intakeRow = intakeQuery.error ? null : intakeQuery.data;
  const intake = intakeRow
    ? {
        dnd: String(intakeRow.dnd_experience),
        gym: String(intakeRow.gym_experience),
        goals: Array.isArray(intakeRow.first_goals) ? intakeRow.first_goals.map(String) : [],
        timeslotId: intakeRow.timeslot_id ? String(intakeRow.timeslot_id) : null,
        reminders: Boolean(intakeRow.session_reminders),
        phone: textOrNull(intakeRow.phone),
        speciesIdea: textOrNull(intakeRow.species_idea),
        classIdea: textOrNull(intakeRow.class_idea),
        fitnessExperience: textOrNull(intakeRow.fitness_experience),
        backstoryIdea: textOrNull(intakeRow.backstory_idea),
        ageBand: textOrNull(intakeRow.age_band),
        teenWaitlist: Boolean(intakeRow.teen_waitlist),
        gymMember: parseGymMember(textOrNull(intakeRow.gym_member)),
        membershipNumber: textOrNull(intakeRow.gym_membership_number),
        membershipVerified: intakeRow.membership_verified === true,
        checkoutPlan: intakeRow.checkout_plan === "member" || intakeRow.checkout_plan === "standard" ? intakeRow.checkout_plan : null,
        signupSrc: textOrNull(intakeRow.signup_src),
        tableStartsOn: textOrNull(intakeRow.table_starts_on)?.slice(0, 10) ?? null,
        tableRequest: textOrNull(intakeRow.table_request),
        preferredSquadId: textOrNull(intakeRow.preferred_squad_id),
        anyOpenTable: intakeRow.any_open_table === true,
        withFriend: intakeRow.with_friend === true,
        friendName: textOrNull(intakeRow.friend_name),
      }
    : null;

  let profile = profileResult;
  let signupColumnReady = true;
  if (missingColumn(profile.error)) {
    signupColumnReady = false;
    profile = await supabase.from("profiles").select(PROFILE_BASE).eq("id", user.id).maybeSingle();
  }

  const notify = shouldNotifyNewAccount({
    authCreatedAt: user.created_at ?? null,
    profileCreatedAt: profile.data?.created_at ? String(profile.data.created_at) : null,
    signupNotifiedAt: signupColumnReady ? (profile.data?.signup_notified_at ?? null) : undefined,
    hasCharacter: Boolean(character.error || character.data),
    hasIntake: Boolean(intakeQuery.error || intake),
  });
  let notice = null;
  if (notify) {
    const account: SignupRecord = {
      userId: user.id,
      email: user.email ?? "",
      displayName: profile.data?.display_name ? String(profile.data.display_name) : "",
      role: profile.data?.app_role ? String(profile.data.app_role) : "player",
      joined: profile.data?.created_at ? String(profile.data.created_at) : "",
      phone: intake?.phone ?? "",
      trainingSlot: intake?.timeslotId ?? "",
      speciesIdea: intake?.speciesIdea ?? "",
      classIdea: intake?.classIdea ?? "",
      fitnessGoals: intake?.goals.join(", ") ?? "",
      gymExperience: intake ? gymLabel(intake.gym) : "",
      fitnessExperience: intake?.fitnessExperience ?? "",
      dndExperience: intake ? dndLabel(intake.dnd) : "",
      sessionReminders: intake ? (intake.reminders ? "yes" : "no") : "",
      backstory: intake?.backstoryIdea ?? "",
      empireMembership: gymMemberLabel(intake?.gymMember ?? null),
      membershipNumber: intake?.membershipNumber ?? "",
      membershipVerified: intake ? (intake.membershipVerified ? "yes" : "no") : "",
      verifiedBy: "",
      verifiedAt: "",
      signupSrc: intake?.signupSrc ?? "",
      tableLabel: "",
      tableRequest: "",
      tableSquad: "",
      withFriend: intake?.withFriend ? "yes" : "no",
      friendName: intake?.friendName ?? "",
    };
    const chosen = tableLabel(intake?.timeslotId ?? "", intake?.tableStartsOn ?? "");
    if (chosen) account.trainingSlot = chosen;
    else if (account.trainingSlot) {
      const slot = await supabase.from("session_timeslots").select("label").eq("id", account.trainingSlot).maybeSingle();
      if (!slot.error && slot.data?.label) {
        account.trainingSlot = displaySlot(String(slot.data.label), false);
      }
    }
    notice = noticeFields(account);
  }

  const seenUserId = user.id;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.user.id === user.id ? sessionData.session.access_token : null;
  const visitClient = accessToken ? createClientWithAccessToken(accessToken) : null;
  // The session is read before after(). after() cannot call cookies(), which was skipping last_seen.
  after(async () => {
    if (!visitClient) {
      console.error("last_seen was not updated.");
      return;
    }
    await recordVisit(visitClient, seenUserId, notice);
  });

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
    firstVisit: !profile.data?.last_seen_at,
    intake,
  };
}

export function setupMessage(viewer: Viewer): string | null {
  if (!viewer.configured) return MISSING_ENV;
  return null;
}
