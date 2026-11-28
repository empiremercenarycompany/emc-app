"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient, dbError } from "@/lib/action-client";
import type { ActionResult } from "@/lib/types";

/** Drop the second-choice hold and wait for the first time. No Stripe session. */
export async function waitForFirstChoice(): Promise<ActionResult> {
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const { error: rpcError } = await supabase.rpc("prefer_first_waitlist");
  const message = dbError(rpcError);
  if (message) return { error: message };
  revalidatePath("/profile");
  revalidatePath("/intake");
  revalidatePath("/dm/signups");
  redirect("/profile?enlisted=1");
}
