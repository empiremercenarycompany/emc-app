"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

function refresh() {
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/squad");
  revalidatePath("/missions");
  revalidatePath("/character");
}

export async function signOut() {
  const { supabase } = await actionClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function setCohortStart(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("set_cohort_start", {
    p_start: String(formData.get("start") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function setCohortSession(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("set_cohort_session", {
    p_session_number: Number(formData.get("number")),
    p_start: String(formData.get("start") ?? ""),
    p_end: String(formData.get("end") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function clearSessions(formData: FormData): Promise<ActionResult> {
  void formData;
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("clear_cohort_sessions");
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function grantPoints(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("grant_staff_attribute_points", {
    p_character_id: String(formData.get("character_id") ?? ""),
    p_points: Number(formData.get("points")),
    p_pool: String(formData.get("pool") ?? ""),
    p_reason: String(formData.get("reason") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function induct(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("induct_character", {
    p_character_id: String(formData.get("character_id") ?? ""),
    p_class: String(formData.get("class_name") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function setLevel(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("set_character_level", {
    p_character_id: String(formData.get("character_id") ?? ""),
    p_level: Number(formData.get("level")),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function createSquad(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const max = String(formData.get("max") ?? "");
  const { error: rpcError } = await supabase.rpc("create_squad", {
    p_name: String(formData.get("name") ?? ""),
    p_max: max ? Number(max) : null,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/squad");
  return { ok: true };
}

export async function assignSquad(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const squad = String(formData.get("squad_id") ?? "");
  const { error: rpcError } = await supabase.rpc("assign_squad", {
    p_character_id: String(formData.get("character_id") ?? ""),
    p_squad_id: squad || null,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/squad");
  return { ok: true };
}

export async function postChallenge(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const titles = formData.getAll("objective_title").map(String).filter((title) => title.trim());
  const { error: rpcError } = await supabase.rpc("post_squad_challenge", {
    p_squad_id: String(formData.get("squad_id") ?? "") || null,
    p_title: String(formData.get("title") ?? ""),
    p_description: String(formData.get("description") ?? ""),
    p_objectives: titles.map((title, index) => ({
      title,
      target_value: String(formData.getAll("objective_target")[index] ?? ""),
      unit: String(formData.getAll("objective_unit")[index] ?? ""),
    })),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/squad");
  revalidatePath("/missions");
  return { ok: true };
}

export async function postAnnouncement(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: membership } = await supabase
    .from("guild_memberships")
    .select("guild_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.guild_id) return { error: "Join the company first." };
  const squadId = String(formData.get("squad_id") ?? "");
  const { error: insertError } = await supabase.from("announcements").insert({
    guild_id: membership.guild_id,
    squad_id: squadId || null,
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    posted_by: user.id,
    pinned: formData.get("pinned") === "on",
  });
  const message = dbError(insertError);
  if (message) return { error: message };
  revalidatePath("/");
  return { ok: true };
}

export async function createSession(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: membership } = await supabase
    .from("guild_memberships")
    .select("guild_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.guild_id) return { error: "Join the company first." };
  const squadId = String(formData.get("squad_id") ?? "");
  const { error: rpcError } = await supabase.rpc("save_table_session", {
    p_id: String(formData.get("id") ?? "") || null,
    p_title: String(formData.get("title") ?? "").trim(),
    p_session_date: String(formData.get("session_date") ?? "").slice(0, 10),
    p_squad_id: squadId || null,
    p_notes: String(formData.get("notes") ?? "").trim(),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/missions");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function setAppRole(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("set_app_role", {
    p_user_id: String(formData.get("user_id") ?? ""),
    p_role: String(formData.get("role") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/schedule");
  return { ok: true };
}
