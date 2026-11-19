"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, dbError } from "@/lib/action-client";
import { noticeFields, type SignupRecord } from "@/lib/notify/signup-fields";
import { displaySlot, dndLabel, enlistError, gymLabel, intakeError } from "@/lib/rules/intake";
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
    timeslot: String(formData.get("timeslot") ?? ""),
  };
  const problem = intakeError(draft);
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
    p_timeslot: draft.timeslot,
    p_reminders: formData.get("reminders") === "on",
    p_phone: phone,
    p_species_idea: species,
    p_class_idea: classIdea,
    p_backstory_idea: backstory,
    p_fitness_experience: fitness,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };

  if (formData.get("enlist") === "1" && user) {
    const record = await enlistRecord(supabase, user.id, user.email ?? "", draft, {
      phone: phone ?? "",
      species: species ?? "",
      classIdea: classIdea ?? "",
      fitness: fitness ?? "",
      backstory: backstory ?? "",
      reminders: formData.get("reminders") === "on",
    });
    const enlistNotice = noticeFields(record);
    after(async () => {
      try {
        const { sendStaffNotice } = await import("@/lib/notify/staff-notice");
        await sendStaffNotice("Enlist details", enlistNotice);
      } catch {
        console.error(JSON.stringify({ status: "failed", messageId: null }));
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/intake");
  revalidatePath("/dm/signups");
  redirect("/profile");
}

async function enlistRecord(
  supabase: NonNullable<Awaited<ReturnType<typeof actionClient>>["supabase"]>,
  userId: string,
  email: string,
  draft: { dnd: string; gym: string; goals: string[]; timeslot: string },
  enlist: { phone: string; species: string; classIdea: string; fitness: string; backstory: string; reminders: boolean },
): Promise<SignupRecord> {
  const [profile, slot] = await Promise.all([
    supabase.from("profiles").select("display_name, app_role, created_at").eq("id", userId).maybeSingle(),
    supabase.from("session_timeslots").select("label, adults_only").eq("id", draft.timeslot).maybeSingle(),
  ]);
  const label = !slot.error && slot.data?.label ? String(slot.data.label) : "";
  return {
    userId,
    email,
    displayName: profile.data?.display_name ? String(profile.data.display_name) : "",
    role: profile.data?.app_role ? String(profile.data.app_role) : "",
    joined: profile.data?.created_at ? String(profile.data.created_at) : "",
    phone: enlist.phone.trim(),
    trainingSlot: label ? displaySlot(label, Boolean(slot.data?.adults_only)) : draft.timeslot,
    speciesIdea: enlist.species.trim(),
    classIdea: enlist.classIdea.trim(),
    fitnessGoals: draft.goals.join(", "),
    gymExperience: gymLabel(draft.gym),
    fitnessExperience: enlist.fitness.trim(),
    dndExperience: dndLabel(draft.dnd),
    sessionReminders: enlist.reminders ? "yes" : "no",
    backstory: enlist.backstory.trim(),
  };
}
