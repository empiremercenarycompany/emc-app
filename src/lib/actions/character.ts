"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, asImpact, dbError } from "@/lib/action-client";
import { ABILITIES, isValidStartingArray, type AbilityName, type AbilityScores } from "@/lib/rules/starting-array";
import type { ActionResult } from "@/lib/types";

function score(formData: FormData, ability: AbilityName): number {
  return Number(formData.get(ability));
}

export async function createCharacter(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };

  const scores = Object.fromEntries(ABILITIES.map((ability) => [ability, score(formData, ability)])) as AbilityScores;
  if (!isValidStartingArray(scores)) {
    return { error: "That starting array is not one of the two legal recruit builds." };
  }

  const { error: rpcError } = await supabase.rpc("create_character", {
    p_name: String(formData.get("name") ?? ""),
    p_origin_word: String(formData.get("origin_word") ?? ""),
    p_profession: String(formData.get("profession") ?? ""),
    p_profession_tool: String(formData.get("profession_tool") ?? ""),
    p_profession_skill: String(formData.get("profession_skill") ?? ""),
    p_species: String(formData.get("species") ?? ""),
    p_strength: scores.strength,
    p_dexterity: scores.dexterity,
    p_constitution: scores.constitution,
    p_intelligence: scores.intelligence,
    p_wisdom: scores.wisdom,
    p_charisma: scores.charisma,
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
