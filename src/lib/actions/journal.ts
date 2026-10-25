"use server";

import { revalidatePath } from "next/cache";
import { actionClient, asImpact, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

export async function saveExercise(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const id = String(formData.get("id") ?? "");
  const { error: rpcError } = await supabase.rpc("curator_save_exercise", {
    p_id: id || null,
    p_name: String(formData.get("name") ?? ""),
    p_focus: String(formData.get("focus") ?? ""),
    p_cues: String(formData.get("cues") ?? ""),
    p_status: String(formData.get("status") ?? "approved"),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/journal");
  return { ok: true };
}

export async function savePool(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const ids = formData.getAll("exercise_id").map(String);
  const { error: rpcError } = await supabase.rpc("save_exercise_pool", {
    p_id: String(formData.get("id") ?? "") || null,
    p_title: String(formData.get("title") ?? ""),
    p_shared: formData.get("shared") === "on",
    p_exercise_ids: ids,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/journal");
  return { ok: true };
}

export async function saveWorkout(payload: {
  poolId: string;
  title: string;
  exercises: { exercise_id: string; target_sets: string; target_reps: string; target_weight: string }[];
}): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("save_player_workout", {
    p_pool_id: payload.poolId,
    p_title: payload.title,
    p_exercises: payload.exercises,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/journal");
  return { ok: true };
}

export async function logLifting(payload: {
  date: string;
  notes: string;
  shareWithSquad: boolean;
  playerWorkoutId: string | null;
  sets: { exercise_id: string; reps: string; weight: string; notes: string }[];
}): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { data, error: rpcError } = await supabase.rpc("log_lifting_session", {
    p_payload: {
      date: payload.date,
      notes: payload.notes,
      share_with_squad: payload.shareWithSquad,
      player_workout_id: payload.playerWorkoutId,
      sets: payload.sets,
    },
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/journal");
  revalidatePath("/character");
  revalidatePath("/");
  revalidatePath("/squad");
  return { impact: asImpact(data) };
}

export async function flagExercise(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("set_exercise_flag", {
    p_exercise_id: String(formData.get("exercise_id") ?? ""),
    p_goal_id: String(formData.get("goal_id") ?? "") || null,
    p_period_start: String(formData.get("period_start") ?? "") || null,
    p_period_end: String(formData.get("period_end") ?? "") || null,
    p_reward_hook: String(formData.get("reward_hook") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/journal");
  return { ok: true };
}

export async function saveTemplate(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: membership } = await supabase
    .from("guild_memberships")
    .select("guild_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.guild_id) return { error: "Join the company first." };
  const exerciseIds = formData.getAll("exercise_id").map(String).filter(Boolean);
  const { data: template, error: insertError } = await supabase
    .from("workout_templates")
    .insert({
      guild_id: membership.guild_id,
      pool_id: String(formData.get("pool_id") ?? ""),
      title: String(formData.get("title") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  const message = dbError(insertError);
  if (message || !template) return { error: message ?? "The template was not saved." };
  if (exerciseIds.length > 0) {
    const { error: rowError } = await supabase.from("workout_template_exercises").insert(
      exerciseIds.map((exerciseId, index) => ({
        template_id: template.id,
        exercise_id: exerciseId,
        position: index + 1,
      })),
    );
    const rowMessage = dbError(rowError);
    if (rowMessage) return { error: rowMessage };
  }
  revalidatePath("/journal");
  return { ok: true };
}

export async function assignTemplate(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("assign_template", {
    p_template_id: String(formData.get("template_id") ?? ""),
    p_character_id: String(formData.get("character_id") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/journal");
  return { ok: true };
}
