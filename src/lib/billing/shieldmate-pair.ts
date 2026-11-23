import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A confirmed pair is an approved Shieldmate request for this player.
 * A pending or withdrawn request does not qualify. A query error does not qualify.
 * Staff can read every request, so the filter is this player's own rows.
 */
export async function confirmedShieldmatePair(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (!UUID.test(userId)) return false;
  const character = await supabase.from("characters").select("id").eq("user_id", userId).maybeSingle();
  if (character.error) return false;
  const characterId = typeof character.data?.id === "string" && UUID.test(character.data.id) ? character.data.id : null;
  const own = characterId
    ? `requested_by.eq.${userId},requester_character_id.eq.${characterId},partner_character_id.eq.${characterId}`
    : `requested_by.eq.${userId}`;
  const rows = await supabase.from("grew_up_requests").select("id").eq("status", "approved").or(own).limit(1);
  if (rows.error) return false;
  return Array.isArray(rows.data) && rows.data.length > 0;
}
