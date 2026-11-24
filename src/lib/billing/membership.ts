import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckoutPlan } from "@/lib/billing/price";
import { isCheckoutPlan } from "@/lib/billing/price";
import { parseGymMember, type GymMember } from "@/lib/rules/public-copy";

export type MembershipDecision = {
  gymMember: GymMember | null;
  membershipVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  staffPlan: CheckoutPlan | null;
  signupSrc: string | null;
};

const EMPTY: MembershipDecision = {
  gymMember: null,
  membershipVerified: false,
  verifiedBy: null,
  verifiedAt: null,
  staffPlan: null,
  signupSrc: null,
};

const COLUMNS =
  "gym_member, membership_verified, membership_verified_by, membership_verified_at, checkout_plan, signup_src";

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** A missing column or a missing row stays on the $120 price. It does not unlock $60. */
export async function loadMembershipDecision(supabase: SupabaseClient, userId: string): Promise<MembershipDecision> {
  const { data, error } = await supabase.from("player_intake").select(COLUMNS).eq("user_id", userId).maybeSingle();
  if (error || !data) return EMPTY;
  return {
    gymMember: parseGymMember(typeof data.gym_member === "string" ? data.gym_member : null),
    membershipVerified: data.membership_verified === true,
    verifiedBy: textOrNull(data.membership_verified_by),
    verifiedAt: textOrNull(data.membership_verified_at),
    staffPlan: isCheckoutPlan(typeof data.checkout_plan === "string" ? data.checkout_plan : null)
      ? data.checkout_plan
      : null,
    signupSrc: textOrNull(data.signup_src),
  };
}
