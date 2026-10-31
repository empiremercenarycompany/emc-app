"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, asImpact, dbError } from "@/lib/action-client";
import { backgroundById, papersMissing, recruitScores } from "@/lib/rules/backgrounds";
import type { AbilityName } from "@/lib/rules/starting-array";
import type { ActionResult } from "@/lib/types";

export async function createCharacter(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };

  const name = String(formData.get("name") ?? "");
  const species = String(formData.get("species") ?? "");
  const backgroundId = String(formData.get("background_id") ?? "");
  const mode = String(formData.get("bonus_mode") ?? "");
  const plus2 = String(formData.get("plus2") ?? "") as AbilityName;
  const plus1 = String(formData.get("plus1") ?? "") as AbilityName;
  const background = backgroundById(backgroundId);
  const scores =
    background && (mode === "plus1" || mode === "plus2")
      ? recruitScores(mode, background.abilities, plus2, plus1)
      : null;
  const missing = papersMissing({ name, species, backgroundId, scores });
  if (missing.length > 0) return { error: missing[0] };

  const { error: rpcError } = await supabase.rpc("file_recruitment_papers", {
    p_name: name,
    p_species: species,
    p_background_id: backgroundId,
    p_tool_id: String(formData.get("tool_id") ?? ""),
    p_bonus_mode: mode,
    p_plus2: plus2,
    p_plus1: plus1,
    p_pronouns: String(formData.get("pronouns") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/");
  redirect("/character?welcomed=1");
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
