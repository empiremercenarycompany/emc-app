"use server";

import { revalidatePath } from "next/cache";
import { actionClient, asImpact, dbError, requireRole } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

function touch() {
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/goals");
  revalidatePath("/character");
  revalidatePath("/missions");
  revalidatePath("/squad");
  revalidatePath("/journal");
  revalidatePath("/trainer");
}

export async function logWorkout(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const custom = formData.get("is_custom") !== "false";
  const payload: Record<string, string> = {
    date: String(formData.get("date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    sets: String(formData.get("sets") ?? ""),
    reps: String(formData.get("reps") ?? ""),
    weight: String(formData.get("weight") ?? ""),
    duration_minutes: String(formData.get("duration_minutes") ?? ""),
    client_id: crypto.randomUUID(),
    is_custom: custom ? "true" : "false",
    bank_pool: String(formData.get("bank_pool") ?? "physical"),
  };
  if (custom) {
    payload.exercise = String(formData.get("exercise") ?? "");
    payload.type = String(formData.get("type") ?? "");
  } else {
    payload.library_workout_id = String(formData.get("library_workout_id") ?? "");
    payload.equipment = String(formData.get("equipment") ?? "");
  }
  const objective = String(formData.get("objective_id") ?? "");
  if (objective) payload.objective_id = objective;

  const { data, error: rpcError } = await supabase.rpc("log_activity", {
    p_kind: "workout",
    p_payload: payload,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { impact: asImpact(data) };
}

export async function logGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { data, error: rpcError } = await supabase.rpc("log_activity", {
    p_kind: "goal",
    p_payload: {
      goal_id: String(formData.get("goal_id") ?? ""),
      date: String(formData.get("date") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { impact: asImpact(data) };
}

export async function createGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: character } = await supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (!character) return { error: "Create a character first." };
  const periodStart = String(formData.get("period_start") ?? "");
  const periodEnd = String(formData.get("period_end") ?? "");
  const parentId = String(formData.get("parent_id") ?? "").trim();
  const row: Record<string, string | boolean | null> = {
    character_id: character.id,
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    target_frequency: String(formData.get("target_frequency") ?? "").trim() || null,
    is_long_term: parentId ? false : formData.get("is_long_term") === "on",
    period_start: periodStart || null,
    period_end: periodEnd || null,
  };
  if (parentId) row.parent_id = parentId;
  const { error: insertError } = await supabase.from("goals").insert(row);
  const message = dbError(insertError);
  if (message) return { error: message };
  revalidatePath("/goals");
  return { ok: true };
}

/** Finishes a short-term step. Does not call log_activity, so nothing is granted. */
export async function completeShortTermGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const goalId = String(formData.get("goal_id") ?? "");
  const { data, error: updateError } = await supabase
    .from("goals")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", goalId)
    .not("parent_id", "is", null)
    .is("completed_at", null)
    .select("id")
    .maybeSingle();
  const message = dbError(updateError);
  if (message) return { error: message };
  if (!data) return { error: "That step is already finished, or it is not a short-term step." };
  touch();
  return { ok: true };
}

/** Staff record the buff and the story. The player already finished the step. */
export async function recordGoalReward(formData: FormData): Promise<ActionResult> {
  const denied = await requireRole("approver");
  if (denied) return denied;
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const rewardId = String(formData.get("reward_id") ?? "");
  const choice = String(formData.get("buff_id") ?? "");
  const other = String(formData.get("buff_other") ?? "").trim();
  const story = String(formData.get("story_reward") ?? "").trim();
  if (!story) return { error: "Write the story reward." };
  const patch: Record<string, string | null> = {
    story_reward: story,
    status: "recorded",
    recorded_by: user.id,
    recorded_at: new Date().toISOString(),
    buff_id: null,
    buff_other: null,
  };
  if (choice === "other") {
    if (!other) return { error: "Name the other buff." };
    patch.buff_other = other;
  } else if (choice) {
    patch.buff_id = choice;
  } else {
    return { error: "Choose a buff." };
  }
  const { error: updateError } = await supabase.from("goal_rewards").update(patch).eq("id", rewardId).eq("status", "ready");
  const message = dbError(updateError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function checkIn(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { data, error: rpcError } = await supabase.rpc("log_activity", {
    p_kind: "checkin",
    p_payload: { session_id: String(formData.get("session_id") ?? "") },
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/missions");
  return { impact: asImpact(data) };
}

export async function logObjective(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { data, error: rpcError } = await supabase.rpc("log_objective_progress", {
    p_objective_id: String(formData.get("objective_id") ?? ""),
    p_amount: Number(formData.get("amount") ?? 1),
    p_note: String(formData.get("note") ?? "") || null,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/squad");
  revalidatePath("/missions");
  return { impact: asImpact({ objective_progress: data, status: "none", points_delta: 0 }) };
}

export async function saveDice(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: character } = await supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (!character) return { error: "Create a character before saving a roll." };
  const { error: insertError } = await supabase.from("dice_rolls").insert({
    character_id: character.id,
    expression: String(formData.get("expression") ?? ""),
    result: Number(formData.get("result")),
    detail: {
      rolls: String(formData.get("rolls") ?? ""),
      mode: String(formData.get("mode") ?? "normal"),
    },
  });
  const message = dbError(insertError);
  if (message) return { error: message };
  return { ok: true };
}
