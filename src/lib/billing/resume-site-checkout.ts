import { resolvePlanPrice } from "@/lib/billing/checkout";
import { signResumeToken } from "@/lib/billing/resume-token";
import {
  buildSiteMetadata,
  isTeenWaitlist,
  normalizeSignupEmail,
  siteCheckoutSessionParams,
  sitePlanFor,
} from "@/lib/billing/site-checkout";
import { getStripe, isStripeCheckoutUrl, stripeWebhookSecret } from "@/lib/billing/stripe";
import { createAnonClient } from "@/lib/supabase/server";

export type ResumeResult =
  | { state: "url"; url: string }
  | { state: "paid" | "teen" | "missing" | "unavailable" };

type SignupRow = {
  paid?: boolean;
  email?: string;
  gym_member?: string;
  membership_number?: string;
  preferred_slot?: string;
  preferred_slot_2?: string;
  waitlist_for?: string;
  age_group?: string;
  teen_waitlist?: string | boolean;
  joining_with_friend?: string;
  friend_name?: string;
  invited_by?: string;
  signup_src?: string;
  writ_number?: string;
  heard_from?: string;
};

/** A cancelled site checkout can be opened again from the signup email. No coupon. */
export async function resumeSiteCheckout(emailInput: string, origin: string): Promise<ResumeResult> {
  const email = normalizeSignupEmail(emailInput);
  if (!email) return { state: "missing" };
  const supabase = createAnonClient();
  const stripe = getStripe();
  if (!supabase || !stripe) return { state: "unavailable" };
  const { data, error } = await supabase.rpc("site_signup_for_checkout", { p_email: email });
  if (error || !data || typeof data !== "object") return { state: "missing" };
  const row = data as SignupRow;
  if (row.paid === true) return { state: "paid" };
  if (isTeenWaitlist({ ageGroup: row.age_group, teenWaitlist: row.teen_waitlist })) return { state: "teen" };
  const gate = await supabase.rpc("resume_checkout_gate", {
    p_secret: stripeWebhookSecret() ?? "",
    p_email: email,
  });
  const decision = gate.data as {
    allowed?: boolean;
    preferred_slot?: string;
    preferred_slot_2?: string;
    checkout_slot?: string;
  } | null;
  if (gate.error || !decision || decision.allowed !== true) return { state: "unavailable" };
  const metadata = buildSiteMetadata({
    email: row.email || email,
    gymMember: row.gym_member,
    membershipNumber: row.membership_number,
    preferredSlot: decision.preferred_slot || row.preferred_slot,
    preferredSlot2: decision.preferred_slot_2 || row.preferred_slot_2,
    checkoutSlot: decision.checkout_slot === "second" ? "second" : "first",
    waitlistFor: row.waitlist_for,
    ageGroup: row.age_group,
    joiningWithFriend: String(row.joining_with_friend ?? ""),
    friendName: row.friend_name,
    invitedBy: row.invited_by,
    signupSrc: row.signup_src,
    writNumber: row.writ_number,
    heardFrom: row.heard_from,
  });
  try {
    const priceId = await resolvePlanPrice(stripe, sitePlanFor(row.gym_member));
    const resumeToken = signResumeToken(metadata.signup_email);
    if (!resumeToken) return { state: "unavailable" };
    const session = await stripe.checkout.sessions.create(
      siteCheckoutSessionParams({ metadata, priceId, origin, resumeToken }),
    );
    if (!isStripeCheckoutUrl(session.url)) return { state: "unavailable" };
    return { state: "url", url: session.url };
  } catch {
    return { state: "unavailable" };
  }
}
