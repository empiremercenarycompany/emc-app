"use server";

import { revalidatePath } from "next/cache";
import { actionClient, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

function touch() {
  revalidatePath("/muster");
  revalidatePath("/character");
  revalidatePath("/check-in");
  revalidatePath("/schedule");
}

export async function recordMuster(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("record_table_muster", {
    p_session_id: String(formData.get("session_id") ?? ""),
    p_squad_id: String(formData.get("squad_id") ?? ""),
    p_lines: [
      {
        character_id: String(formData.get("character_id") ?? ""),
        workouts: Number(formData.get("workouts") ?? 0),
        nutrition: Number(formData.get("nutrition") ?? 0),
        mental: Number(formData.get("mental") ?? 0),
        social: Number(formData.get("social") ?? 0),
      },
    ],
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function approveSquadMuster(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("approve_squad_muster", {
    p_session_id: String(formData.get("session_id") ?? ""),
    p_squad_id: String(formData.get("squad_id") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function awardBuff(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const sessionId = String(formData.get("session_id") ?? "");
  const { error: rpcError } = await supabase.rpc("award_buff", {
    p_character_id: String(formData.get("character_id") ?? ""),
    p_buff_id: String(formData.get("buff_id") ?? ""),
    p_session_id: sessionId || null,
    p_note: String(formData.get("note") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function useBuff(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("use_character_buff", {
    p_id: String(formData.get("buff_row_id") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/character");
  return { ok: true };
}
