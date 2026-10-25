"use server";

import { revalidatePath } from "next/cache";
import { actionClient, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

function refresh() {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/missions");
  revalidatePath("/notes");
  revalidatePath("/schedule");
  revalidatePath("/character");
}

export async function advanceMilestone(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("advance_milestone", {
    p_character_id: String(formData.get("character_id") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function correctAttendance(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("correct_attendance", {
    p_session_id: String(formData.get("session_id") ?? ""),
    p_character_id: String(formData.get("character_id") ?? ""),
    p_present: formData.get("present") === "true",
    p_loot_share: formData.get("loot_share") === "true",
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function saveStaffNote(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: membership } = await supabase
    .from("guild_memberships")
    .select("guild_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.guild_id) return { error: "Join the company first." };
  const sessionId = String(formData.get("session_id") ?? "");
  const characterId = String(formData.get("character_id") ?? "");
  const squadId = String(formData.get("squad_id") ?? "");
  if (!sessionId && !characterId && !squadId) {
    return { error: "Pick a session, a player, or a squad." };
  }
  const { error: insertError } = await supabase.from("dm_notes").insert({
    guild_id: membership.guild_id,
    session_id: sessionId || null,
    character_id: characterId || null,
    squad_id: squadId || null,
    body: String(formData.get("body") ?? "").trim(),
    created_by: user.id,
  });
  const message = dbError(insertError);
  if (message) return { error: message };
  revalidatePath("/notes");
  return { ok: true };
}

export async function saveCalendarEvent(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: membership } = await supabase
    .from("guild_memberships")
    .select("guild_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.guild_id) return { error: "Join the company first." };
  const start = String(formData.get("start") ?? "");
  const { error: insertError } = await supabase.from("calendar_events").insert({
    guild_id: membership.guild_id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    start_time: start ? `${start}T12:00:00` : null,
    type: String(formData.get("type") ?? "training"),
    created_by: user.id,
  });
  const message = dbError(insertError);
  if (message) return { error: message };
  revalidatePath("/calendar");
  return { ok: true };
}
