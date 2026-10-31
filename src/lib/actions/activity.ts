"use server";

import { revalidatePath } from "next/cache";
import { actionClient, asImpact, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

function touch() {
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/goals");
  revalidatePath("/character");
  revalidatePath("/missions");
  revalidatePath("/squad");
  revalidatePath("/journal");
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
  const { error: insertError } = await supabase.from("goals").insert({
    character_id: character.id,
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    target_frequency: String(formData.get("target_frequency") ?? "").trim() || null,
    is_long_term: formData.get("is_long_term") === "on",
    period_start: periodStart || null,
    period_end: periodEnd || null,
  });
  const message = dbError(insertError);
  if (message) return { error: message };
  revalidatePath("/goals");
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
