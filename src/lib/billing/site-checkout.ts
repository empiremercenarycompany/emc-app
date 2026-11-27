import { EMC_GYM_MONTHLY, EMC_MONTHLY } from "@/lib/billing/plans";
import type { CheckoutPlan } from "@/lib/billing/price";
import { PRODUCT_NAME_MEMBER, PRODUCT_NAME_STANDARD } from "@/lib/rules/public-copy";

/**
 * Site ENLIST Checkout contract. The marketing site creates the session.
 * The app webhook reads the same shape. There is no site signup id.
 * Match the payment to the signup and the player by email, case-insensitive.
 *
 * Mode: subscription.
 * customer_email: the signup email.
 * Price lookup key: emc_monthly ($60, current members, number may be blank)
 * or emc_gym_monthly ($120).
 * The same metadata object is set on the session and on subscription_data.
 * No Shieldmate coupon on this session. The app adds shieldmate_20x2 later,
 * after a pair is confirmed.
 * Teen waitlist does not get a session. Ages 16–17 can. A parent can pay.
 * Stripe secret env: EMC_STRIPE_SECRET_KEY. Test mode until live keys exist.
 */
export const SITE_CHECKOUT_SURFACE = "site";

export const SITE_CHECKOUT_METADATA_KEYS = [
  "surface",
  "plan",
  "product_name",
  "signup_email",
  "gym_member",
  "membership_number",
  "preferred_slot",
  "waitlist_for",
  "age_group",
  "joining_with_friend",
  "friend_name",
  "invited_by",
  "signup_src",
  "writ_number",
  "heard_from",
] as const;

export type SiteMetadataKey = (typeof SITE_CHECKOUT_METADATA_KEYS)[number];
export type SiteMetadata = Record<SiteMetadataKey, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeSignupEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  return EMAIL.test(email) ? email : null;
}

export function emptySiteMetadata(): SiteMetadata {
  return {
    surface: SITE_CHECKOUT_SURFACE,
    plan: EMC_GYM_MONTHLY,
    product_name: PRODUCT_NAME_STANDARD,
    signup_email: "",
    gym_member: "",
    membership_number: "",
    preferred_slot: "",
    waitlist_for: "",
    age_group: "",
    joining_with_friend: "",
    friend_name: "",
    invited_by: "",
    signup_src: "",
    writ_number: "",
    heard_from: "",
  };
}

/** Keeps only the contract keys. A signup id is dropped on purpose. */
export function siteMetadataFromUnknown(value: Record<string, string | null | undefined> | null | undefined): SiteMetadata {
  const metadata = emptySiteMetadata();
  if (!value) return metadata;
  for (const key of SITE_CHECKOUT_METADATA_KEYS) {
    const raw = value[key];
    if (typeof raw === "string") metadata[key] = raw.trim().slice(0, 500);
  }
  metadata.surface = SITE_CHECKOUT_SURFACE;
  const email = normalizeSignupEmail(metadata.signup_email);
  metadata.signup_email = email ?? "";
  return metadata;
}

export function isTeenWaitlist(input: { ageGroup?: string | null; teenWaitlist?: boolean | string | null }): boolean {
  const age = (input.ageGroup ?? "").trim().toLowerCase();
  if (age === "under_16") return true;
  if (input.teenWaitlist === true) return true;
  const flag = String(input.teenWaitlist ?? "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

/** $60 for a current member, including a blank membership number. Everyone else is $120. */
export function sitePlanFor(gymMember: string | null | undefined, explicitPlan?: string | null): CheckoutPlan {
  if (explicitPlan === EMC_MONTHLY || explicitPlan === "member") return "member";
  if (explicitPlan === EMC_GYM_MONTHLY || explicitPlan === "standard") return "standard";
  return (gymMember ?? "").trim().toLowerCase() === "current" ? "member" : "standard";
}

export function siteLookupKey(plan: CheckoutPlan): string {
  return plan === "member" ? EMC_MONTHLY : EMC_GYM_MONTHLY;
}

export function siteProductName(plan: CheckoutPlan): string {
  return plan === "member" ? PRODUCT_NAME_MEMBER : PRODUCT_NAME_STANDARD;
}

export function buildSiteMetadata(input: {
  email: string;
  gymMember?: string | null;
  membershipNumber?: string | null;
  preferredSlot?: string | null;
  waitlistFor?: string | null;
  ageGroup?: string | null;
  joiningWithFriend?: string | null;
  friendName?: string | null;
  invitedBy?: string | null;
  signupSrc?: string | null;
  writNumber?: string | null;
  heardFrom?: string | null;
}): SiteMetadata {
  const plan = sitePlanFor(input.gymMember);
  const email = normalizeSignupEmail(input.email) ?? "";
  return siteMetadataFromUnknown({
    surface: SITE_CHECKOUT_SURFACE,
    plan: siteLookupKey(plan),
    product_name: siteProductName(plan),
    signup_email: email,
    gym_member: input.gymMember ?? "",
    membership_number: input.membershipNumber ?? "",
    preferred_slot: input.preferredSlot ?? "",
    waitlist_for: input.waitlistFor ?? "",
    age_group: input.ageGroup ?? "",
    joining_with_friend: input.joiningWithFriend ?? "",
    friend_name: input.friendName ?? "",
    invited_by: input.invitedBy ?? "",
    signup_src: input.signupSrc ?? "",
    writ_number: input.writNumber ?? "",
    heard_from: input.heardFrom ?? "",
  });
}

/** Subscription Checkout with the contract metadata and no coupon. */
export function siteCheckoutSessionParams(input: {
  metadata: SiteMetadata;
  priceId: string;
  origin: string;
  resumeToken: string;
}): {
  mode: "subscription";
  customer_email: string;
  line_items: { price: string; quantity: 1 }[];
  metadata: SiteMetadata;
  subscription_data: { metadata: SiteMetadata };
  success_url: string;
  cancel_url: string;
} {
  const token = encodeURIComponent(input.resumeToken);
  return {
    mode: "subscription",
    customer_email: input.metadata.signup_email,
    line_items: [{ price: input.priceId, quantity: 1 }],
    metadata: input.metadata,
    subscription_data: { metadata: input.metadata },
    success_url: `${input.origin}/pay?paid=1`,
    cancel_url: `${input.origin}/pay?token=${token}&canceled=1`,
  };
}
