import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The $20 x 2 coupon is for a Shieldmate invite that was accepted before it
 * expired. Paying before the friend joins does not spend the coupon: checkout
 * applies it once the invite is paired, and accept tries to add it to a
 * subscription that already exists.
 */
export async function confirmedShieldmatePair(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (!UUID.test(userId)) return false;
  const rows = await supabase
    .from("shieldmate_invites")
    .select("paired_at, expires_at")
    .eq("status", "paired")
    .or(`host_user_id.eq.${userId},guest_user_id.eq.${userId}`)
    .limit(1);
  if (rows.error || !Array.isArray(rows.data) || rows.data.length === 0) return false;
  const row = rows.data[0] as { paired_at?: string | null; expires_at?: string | null };
  const paired = Date.parse(row.paired_at ?? "");
  const expires = Date.parse(row.expires_at ?? "");
  if (!Number.isFinite(paired) || !Number.isFinite(expires)) return false;
  return paired <= expires;
}
