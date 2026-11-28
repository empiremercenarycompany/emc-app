import { createAnonClient } from "@/lib/supabase/server";

/**
 * After a paid site checkout, email the app sign-in link.
 * Uses the anon auth sender. No service role. No player confirmation mail.
 * Missing Supabase config skips the send.
 */
export async function sendAppInvite(email: string): Promise<void> {
  const supabase = createAnonClient();
  if (!supabase) return;
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://emc.thegiantdungeonmaster.com";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/intake")}` },
  });
  if (error) throw new Error("App invite was not sent");
}
