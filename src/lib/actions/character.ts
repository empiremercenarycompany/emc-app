"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, asImpact, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

export async function createCharacter(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };

  const { error: rpcError } = await supabase.rpc("file_recruitment_papers", {
    p_name: String(formData.get("name") ?? ""),
    p_species: String(formData.get("species") ?? ""),
    p_background_id: String(formData.get("background_id") ?? ""),
    p_tool_id: String(formData.get("tool_id") ?? ""),
    p_bonus_mode: String(formData.get("bonus_mode") ?? ""),
    p_plus2: String(formData.get("plus2") ?? ""),
    p_plus1: String(formData.get("plus1") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/");
  redirect("/character");
}

export async function saveNotes(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { error: updateError } = await supabase
    .from("characters")
    .update({ notes: String(formData.get("notes") ?? "") })
    .eq("user_id", user.id);
  const message = dbError(updateError);
  if (message) return { error: message };
  revalidatePath("/character");
  return { ok: true };
}

export async function spendIncrease(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { data, error: rpcError } = await supabase.rpc("spend_attribute_points", {
    p_character_id: String(formData.get("character_id")),
    p_strength: Number(formData.get("strength")),
    p_dexterity: Number(formData.get("dexterity")),
    p_constitution: Number(formData.get("constitution")),
    p_intelligence: Number(formData.get("intelligence")),
    p_wisdom: Number(formData.get("wisdom")),
    p_charisma: Number(formData.get("charisma")),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/character");
  revalidatePath("/");
  return { impact: asImpact(data) };
}

export async function saveDisplayName(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const displayName = String(formData.get("display_name") ?? "").trim();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null })
    .eq("id", user.id);
  const message = dbError(updateError);
  if (message) return { error: message };
  revalidatePath("/");
  return { ok: true };
}
