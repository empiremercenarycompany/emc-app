"use server";

import { revalidatePath } from "next/cache";
import { actionClient, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

function touch() {
  revalidatePath("/character");
  revalidatePath("/muster");
}

export async function saveNpc(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const id = String(formData.get("npc_id") ?? "");
  const { error: rpcError } = await supabase.rpc("save_character_npc", {
    p_id: id || null,
    p_name: String(formData.get("name") ?? ""),
    p_relationship: String(formData.get("relationship") ?? ""),
    p_likeness: String(formData.get("likeness") ?? ""),
    p_submit: formData.get("submit") === "yes",
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function approveNpc(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("approve_character_npc", {
    p_id: String(formData.get("npc_id") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function returnNpc(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("return_character_npc", {
    p_id: String(formData.get("npc_id") ?? ""),
    p_note: String(formData.get("note") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}
