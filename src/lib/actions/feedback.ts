"use server";

import { actionClient, dbError } from "@/lib/action-client";
import { feedbackFailure } from "@/lib/rules/feedback-error";
import { APP_VERSION } from "@/lib/version";
import type { ActionResult } from "@/lib/types";

export async function sendFeedback(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const body = String(formData.get("body") ?? "").trim();
  const page = String(formData.get("page") ?? "/").slice(0, 200) || "/";
  if (body.length < 1) return { error: "Write a note first." };
  if (body.length > 2000) return { error: "Keep the note under 2000 characters." };
  const { error: insertError } = await supabase.from("player_feedback").insert({
    user_id: user.id,
    body,
    page,
    app_version: APP_VERSION,
  });
  const message = dbError(insertError);
  if (message) return { error: feedbackFailure(message) };
  return { ok: true };
}
