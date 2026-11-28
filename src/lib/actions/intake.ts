"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, dbError } from "@/lib/action-client";
import { noticeFields, type SignupRecord } from "@/lib/notify/signup-fields";
import { confirmationFirstName } from "@/lib/notify/player-confirmation-template";
import { displaySlot, dndLabel, enlistError, gymLabel, intakeError, isAgeBand } from "@/lib/rules/intake";
import { normalizeTimeslotId, requestPhrase, tableLabel } from "@/lib/rules/saturday-tables";
import { gymMemberLabel, membershipNumberError, normalizeMembershipNumber, parseGymMember, isGameGridSrc } from "@/lib/rules/public-copy";
import type { ActionResult } from "@/lib/types";

function providedText(formData: FormData, name: string): string | null {
  if (!formData.has(name)) return null;
  return String(formData.get(name) ?? "");
}

export async function saveIntake(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const phone = providedText(formData, "phone");
  const species = providedText(formData, "species");
  const classIdea = providedText(formData, "class_idea");
  const fitness = providedText(formData, "fitness");
  const backstory = providedText(formData, "backstory");
  const draft = {
    dnd: String(formData.get("dnd") ?? ""),
    gym: String(formData.get("gym") ?? ""),
    goals: formData.getAll("goal").map((goal) => String(goal).trim()).filter(Boolean),
    timeslot: normalizeTimeslotId(String(formData.get("timeslot") ?? "")) ?? "",
  };
  const startsOn = String(formData.get("starts_on") ?? "");
  const squadId = String(formData.get("squad_id") ?? "");
  const tableRequest = String(formData.get("table_request") ?? "");
  const withFriend = formData.get("with_friend") === "1";
  const anyOpen = formData.get("any_open") === "1";
  const friendName = String(formData.get("friend_name") ?? "");
  const age = providedText(formData, "age");
  const enlisting = formData.get("enlist") === "1";
  const waiting = age === "under_16";
  const gymMember = enlisting && !waiting ? parseGymMember(providedText(formData, "gym_member")) : null;
  if (enlisting && !waiting && !gymMember) return { error: "Say which rate is yours." };
  const membershipNumber = normalizeMembershipNumber(providedText(formData, "gym_membership_number") ?? "");
  if (enlisting && gymMember === "current") {
    const numberProblem = membershipNumberError(membershipNumber);
    if (numberProblem) return { error: numberProblem };
  }
  const secondSlot = normalizeTimeslotId(String(formData.get("second_timeslot") ?? "")) ?? "";
  const secondStart = String(formData.get("second_starts_on") ?? "").trim();
  if (!waiting && secondSlot && secondSlot === draft.timeslot && secondStart === startsOn) {
    return { error: "Pick a different second time." };
  }
  const signupSrc = providedText(formData, "signup_src");
  const writNumber = isGameGridSrc(signupSrc) ? providedText(formData, "writ_number") : signupSrc !== null ? "" : null;
  const problem = intakeError({
    ...draft,
    timeslot: waiting ? "" : draft.timeslot,
    ...(age !== null ? { age } : {}),
  });
  if (problem) return { error: problem };
  if (phone !== null || species !== null || classIdea !== null || fitness !== null || backstory !== null) {
    const enlistProblem = enlistError({
      phone: phone ?? "",
      species: species ?? "",
      classIdea: classIdea ?? "",
      fitness: fitness ?? "",
      backstory: backstory ?? "",
    });
    if (enlistProblem) return { error: enlistProblem };
  }
  const { error: rpcError } = await supabase.rpc("save_player_intake", {
    p_dnd: draft.dnd,
    p_gym: draft.gym,
    p_goals: draft.goals,
    p_timeslot: waiting ? null : draft.timeslot,
    ...(formData.has("starts_on") || formData.has("table_request")
      ? {
          p_squad_id: waiting || !squadId ? null : squadId,
          p_starts_on: waiting || !startsOn ? null : startsOn,
          p_table_request: waiting || !tableRequest ? null : tableRequest,
          p_any_open: anyOpen,
          p_with_friend: withFriend,
          p_friend_name: friendName,
        }
      : {}),
    ...(age !== null && isAgeBand(age) ? { p_age_band: age } : {}),
    ...(gymMember ? { p_gym_member: gymMember } : {}),
    ...(gymMember === "current" ? { p_gym_membership_number: membershipNumber } : waiting ? { p_gym_membership_number: "" } : {}),
    ...(signupSrc !== null ? { p_signup_src: signupSrc } : {}),
    ...(writNumber !== null ? { p_writ_number: writNumber } : {}),
    p_reminders: formData.get("reminders") === "on",
    p_phone: phone,
    p_species_idea: species,
    p_class_idea: classIdea,
    p_backstory_idea: backstory,
    p_fitness_experience: fitness,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };

  let seatOutcome = "";
  if (!waiting && draft.timeslot && user) {
    const assigned = await supabase.rpc("assign_saturday_choices", {
      p_second_slot: secondSlot || null,
      p_second_start: secondStart || null,
    });
    const assignMessage = dbError(assigned.error);
    if (assignMessage) return { error: assignMessage };
    if (assigned.data && typeof assigned.data === "object" && "outcome" in assigned.data) {
      seatOutcome = String((assigned.data as { outcome?: string }).outcome ?? "");
    }
  }

  if (formData.get("enlist") === "1" && user) {
    const record = await enlistRecord(supabase, user.id, user.email ?? "", draft, {
      phone: phone ?? "",
      species: species ?? "",
      classIdea: classIdea ?? "",
      fitness: fitness ?? "",
      backstory: backstory ?? "",
      reminders: formData.get("reminders") === "on",
      empireMembership: gymMemberLabel(gymMember),
      membershipNumber: gymMember === "current" ? (membershipNumber ?? "").trim() : "",
      signupSrc: (signupSrc ?? "").trim(),
      tableLabel: tableLabel(draft.timeslot, startsOn) ?? "",
      ageBand: age ?? "",
      tableRequest,
      withFriend,
      friendName,
    });
    if (waiting) record.trainingSlot = "Teen waitlist";
    const enlistNotice = noticeFields(record);
    const confirmation = {
      firstName: confirmationFirstName(record.displayName),
      preferredSlot: record.trainingSlot,
      ageBand: age,
      email: record.email,
      gymMember,
      signupSrc,
    };
    after(async () => {
      try {
        const { sendStaffNotice } = await import("@/lib/notify/staff-notice");
        await sendStaffNotice("Enlist details", enlistNotice);
      } catch {
        console.error(JSON.stringify({ status: "failed", messageId: null }));
      }
      if (waiting || seatOutcome === "waitlist") return;
      try {
        const { sendPlayerConfirmation } = await import("@/lib/notify/player-confirmation");
        await sendPlayerConfirmation(confirmation);
      } catch {
        console.error(JSON.stringify({ status: "failed", messageId: null }));
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/intake");
  revalidatePath("/dm/signups");
  redirect("/profile?enlisted=1");
}

async function enlistRecord(
  supabase: NonNullable<Awaited<ReturnType<typeof actionClient>>["supabase"]>,
  userId: string,
  email: string,
  draft: { dnd: string; gym: string; goals: string[]; timeslot: string },
  enlist: {
    phone: string;
    species: string;
    classIdea: string;
    fitness: string;
    backstory: string;
    reminders: boolean;
    empireMembership: string;
    membershipNumber: string;
    signupSrc: string;
    tableLabel: string;
    ageBand: string;
    tableRequest: string;
    withFriend: boolean;
    friendName: string;
  },
): Promise<SignupRecord> {
  const [profile, slot] = await Promise.all([
    supabase.from("profiles").select("display_name, app_role, created_at").eq("id", userId).maybeSingle(),
    supabase.from("session_timeslots").select("label").eq("id", draft.timeslot).maybeSingle(),
  ]);
  const label = !slot.error && slot.data?.label ? String(slot.data.label) : "";
  return {
    userId,
    email,
    displayName: profile.data?.display_name ? String(profile.data.display_name) : "",
    role: profile.data?.app_role ? String(profile.data.app_role) : "",
    joined: profile.data?.created_at ? String(profile.data.created_at) : "",
    phone: enlist.phone.trim(),
    trainingSlot: enlist.tableLabel || (label ? displaySlot(label) : draft.timeslot),
    speciesIdea: enlist.species.trim(),
    classIdea: enlist.classIdea.trim(),
    fitnessGoals: draft.goals.join(", "),
    gymExperience: gymLabel(draft.gym),
    fitnessExperience: enlist.fitness.trim(),
    dndExperience: dndLabel(draft.dnd),
    sessionReminders: enlist.reminders ? "yes" : "no",
    backstory: enlist.backstory.trim(),
    empireMembership: enlist.empireMembership,
    membershipNumber: enlist.membershipNumber,
    membershipVerified: "",
    verifiedBy: "",
    verifiedAt: "",
    signupSrc: enlist.signupSrc,
    tableLabel: enlist.tableLabel,
    tableRequest: requestPhrase(enlist.tableRequest),
    tableSquad: "",
    withFriend: enlist.withFriend ? "yes" : "no",
    friendName: enlist.withFriend ? enlist.friendName.trim() : "",
    placementStatus: "",
  };
}
