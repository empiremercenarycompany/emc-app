"use server";

import { revalidatePath } from "next/cache";
import { actionClient, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveDmSessionNote(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (profile?.app_role !== "dm") return { error: "DM role required." };
  const sessionId = String(formData.get("session_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID.test(sessionId)) return { error: "Choose a session." };
  if (!body || body.length > 4000) return { error: "Write a note." };
  const { data: membership } = await supabase
    .from("guild_memberships")
    .select("guild_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.guild_id) return { error: "Join the company first." };
  const { error: insertError } = await supabase.from("dm_notes").insert({
    guild_id: membership.guild_id,
    session_id: sessionId,
    body,
    created_by: user.id,
  });
  const message = dbError(insertError);
  if (message) {
    if (/row-level|permission denied|policy/i.test(message)) return { error: "That note could not be saved." };
    return { error: message };
  }
  revalidatePath("/dm");
  revalidatePath("/notes");
  return { ok: true };
}
