import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoticeField } from "@/lib/notify/signup-fields";

type SendNotice = (fields: NoticeField[]) => Promise<void>;

async function sendNewAccount(fields: NoticeField[]) {
  const { sendStaffNotice } = await import("@/lib/notify/staff-notice");
  await sendStaffNotice("New account", fields);
}

/**
 * last_seen is written with a client that already has the session.
 * The new-account email is sent only after this profile claims signup_notified_at.
 */
export async function recordVisit(
  client: SupabaseClient,
  userId: string,
  notice: NoticeField[] | null,
  send: SendNotice = sendNewAccount,
): Promise<void> {
  try {
    const seen = await client.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
    if (seen.error) console.error("last_seen was not updated.");
  } catch {
    console.error("last_seen was not updated.");
    return;
  }
  if (!notice) return;
  try {
    const claimed = await client
      .from("profiles")
      .update({ signup_notified_at: new Date().toISOString() })
      .eq("id", userId)
      .is("signup_notified_at", null)
      .select("id")
      .maybeSingle();
    if (claimed.error) {
      console.error("Signup notice was not recorded.");
      return;
    }
    if (!claimed.data) return;
    await send(notice);
  } catch {
    console.error(JSON.stringify({ status: "failed", messageId: null }));
  }
}
