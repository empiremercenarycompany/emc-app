"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, dbError } from "@/lib/action-client";
import { intakeError } from "@/lib/rules/intake";
import type { ActionResult } from "@/lib/types";

export async function saveIntake(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const draft = {
    dnd: String(formData.get("dnd") ?? ""),
    gym: String(formData.get("gym") ?? ""),
    goals: formData.getAll("goal").map((goal) => String(goal).trim()).filter(Boolean),
    timeslot: String(formData.get("timeslot") ?? ""),
  };
  const problem = intakeError(draft);
  if (problem) return { error: problem };
  const { error: rpcError } = await supabase.rpc("save_player_intake", {
    p_dnd: draft.dnd,
    p_gym: draft.gym,
    p_goals: draft.goals,
    p_timeslot: draft.timeslot,
    p_reminders: formData.get("reminders") === "on",
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/intake");
  redirect("/profile");
}
