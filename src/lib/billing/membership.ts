import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckoutPlan } from "@/lib/billing/price";
import { isCheckoutPlan } from "@/lib/billing/price";
import { parseGymMember, type GymMember } from "@/lib/rules/public-copy";

export type MembershipDecision = {
  hasIntake: boolean;
  ageBand: string | null;
  teenWaitlist: boolean;
  gymMember: GymMember | null;
  membershipVerified: boolean;
  membershipNumber: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  staffPlan: CheckoutPlan | null;
  signupSrc: string | null;
  heldChoice: "first" | "second" | "waitlist" | null;
  preferredSlot: string | null;
  preferredSlot2: string | null;
};

const EMPTY: MembershipDecision = {
  hasIntake: false,
  ageBand: null,
  teenWaitlist: false,
  gymMember: null,
  membershipVerified: false,
  membershipNumber: null,
  verifiedBy: null,
  verifiedAt: null,
  staffPlan: null,
  signupSrc: null,
  heldChoice: null,
  preferredSlot: null,
  preferredSlot2: null,
};

const COLUMNS =
  "age_band, teen_waitlist, gym_member, membership_verified, gym_membership_number, membership_verified_by, membership_verified_at, checkout_plan, signup_src";
const SLOT_COLUMNS = `${COLUMNS}, timeslot_id, table_starts_on, second_timeslot_id, second_starts_on, held_choice`;

function missingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .+ does not exist/i.test(error.message ?? "");
}

function slotKey(timeslot: unknown, startsOn: unknown): string | null {
  if (typeof timeslot !== "string" || typeof startsOn !== "string") return null;
  const date = startsOn.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (timeslot !== "morning" && timeslot !== "afternoon" && timeslot !== "evening") return null;
  return `${timeslot}:${date}`;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** A missing column or a missing row stays on the $120 price. It does not unlock $60. */
export async function loadMembershipDecision(supabase: SupabaseClient, userId: string): Promise<MembershipDecision> {
  let result = await supabase.from("player_intake").select(SLOT_COLUMNS).eq("user_id", userId).maybeSingle();
  if (missingColumn(result.error)) {
    result = await supabase.from("player_intake").select(COLUMNS).eq("user_id", userId).maybeSingle();
  }
  const { data, error } = result;
  if (error || !data) return EMPTY;
  const held = data.held_choice;
  return {
    hasIntake: true,
    ageBand: textOrNull(data.age_band),
    teenWaitlist: data.teen_waitlist === true || data.age_band === "under_16",
    gymMember: parseGymMember(typeof data.gym_member === "string" ? data.gym_member : null),
    membershipVerified: data.membership_verified === true,
    membershipNumber: textOrNull(data.gym_membership_number),
    verifiedBy: textOrNull(data.membership_verified_by),
    verifiedAt: textOrNull(data.membership_verified_at),
    staffPlan: isCheckoutPlan(typeof data.checkout_plan === "string" ? data.checkout_plan : null)
      ? data.checkout_plan
      : null,
    signupSrc: textOrNull(data.signup_src),
    heldChoice: held === "first" || held === "second" || held === "waitlist" ? held : null,
    preferredSlot: slotKey(data.timeslot_id, data.table_starts_on),
    preferredSlot2: slotKey(data.second_timeslot_id, data.second_starts_on),
  };
}
