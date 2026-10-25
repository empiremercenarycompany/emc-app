import { MISSING_ENV } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Impact } from "@/lib/types";

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
