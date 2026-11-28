"use server";

import { revalidatePath } from "next/cache";
import { actionClient, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

export async function createShieldmateInvite(): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("create_shieldmate_invite");
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function acceptShieldmateInvite(formData: FormData): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter the Shieldmate code." };
  const { error: rpcError } = await supabase.rpc("accept_shieldmate_invite", { p_code: code });
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/profile");
  return { ok: true };
}
