"use server";

import { redirect } from "next/navigation";
import { confirmOtpType, safeNextPath } from "@/lib/auth-next";
import { createClient } from "@/lib/supabase/server";

/** Uses the link only after the player presses Continue. A GET never calls this. */
export async function confirmSignIn(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = confirmOtpType(String(formData.get("type") ?? ""));
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!tokenHash || !type) redirect("/auth/confirm?error=link");
  const supabase = await createClient();
  if (!supabase) redirect("/auth/confirm?error=link");
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect("/auth/confirm?error=link");
  redirect(next);
}
