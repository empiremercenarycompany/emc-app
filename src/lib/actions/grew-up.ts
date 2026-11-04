"use server";

import { revalidatePath } from "next/cache";
import { actionClient, dbError } from "@/lib/action-client";
import { grewUpChoice } from "@/lib/rules/grew-up";
import type { ActionResult } from "@/lib/types";

function touch() {
  revalidatePath("/character");
  revalidatePath("/trainer");
}

export async function requestGrewUp(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const kind = String(formData.get("kind") ?? "");
  const optionId = String(formData.get("option_id") ?? "");
  const partner = String(formData.get("partner") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!partner) return { error: "Name their character." };
  if (!grewUpChoice(kind, optionId)) return { error: "Choose a proficiency from the list." };
  if (note.length < 1) return { error: "Write a short note." };
  if (note.length > 280) return { error: "Keep the note short." };
  const { error: rpcError } = await supabase.rpc("request_grew_up", {
    p_partner: partner,
    p_kind: kind,
    p_option: optionId,
    p_note: note,
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function withdrawGrewUp(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  if (String(formData.get("confirm") ?? "") !== "yes") return { error: "Confirm the withdraw first." };
  const { error: rpcError } = await supabase.rpc("withdraw_grew_up", {
    p_request: String(formData.get("request_id") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}

export async function approveGrewUp(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("approve_grew_up", {
    p_request: String(formData.get("request_id") ?? ""),
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  touch();
  return { ok: true };
}
