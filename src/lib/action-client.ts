import { MISSING_ENV } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isLogApprover, isStaff, type AppRole, type Impact } from "@/lib/types";

export async function actionClient() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, error: MISSING_ENV };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, error: "Sign in first." };
  return { supabase, user: data.user, error: null };
}

export function asImpact(value: unknown): Impact {
  if (!value || typeof value !== "object") return {};
  return value as Impact;
}

export function dbError(error: { message: string } | null): string | null {
  return error?.message ?? null;
}

/** Reject a player before a staff action reaches the database. */
export async function requireRole(kind: "staff" | "approver"): Promise<{ error: string } | null> {
  const { supabase, user, error } = await actionClient();
  if (!supabase || !user || error) return { error: error ?? "Sign in first." };
  const { data } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  const role = (data?.app_role as AppRole | undefined) ?? "player";
  const allowed = kind === "approver" ? isLogApprover(role) : isStaff(role);
  if (!allowed) return { error: "Staff role required." };
  return null;
}
