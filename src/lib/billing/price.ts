import { MEMBER_CHECKOUT_BEFORE_VERIFY } from "@/lib/billing/member-checkout";
import { EMC_GYM_MONTHLY, EMC_MONTHLY } from "@/lib/billing/plans";
import {
  VERIFY_MEMBERSHIP_NOTE,
  type GymMember,
  parseGymMember,
} from "@/lib/rules/public-copy";

export const MEMBER_PRICE_ENV = "EMC_STRIPE_PRICE_MEMBER";
export const STANDARD_PRICE_ENV = "EMC_STRIPE_PRICE_STANDARD";

export const MEMBER_PRICE_CENTS = 6000;
export const STANDARD_PRICE_CENTS = 12000;
export const SHIELDMATE_OFF_CENTS = 2000;
export const SHIELDMATE_MONTHS = 2;

export type CheckoutPlan = "member" | "standard";

const PRICE_ID = /^price_[A-Za-z0-9_]+$/;

/** Player-facing. The technical reason stays in the server log. Nothing was charged. */
export function playerPriceFailureMessage(): string {
  return "Payment isn't open right now. Nothing was charged.";
}

export function priceFailureMessage(plan: CheckoutPlan, reason: "missing" | "invalid"): string {
  if (plan === "standard" && reason === "missing") {
    return "The $120 price could not be resolved. The $60 price was not charged.";
  }
  if (plan === "standard") {
    return "EMC_STRIPE_PRICE_STANDARD is not a Stripe price id. The $120 price was not charged.";
  }
  if (reason === "missing") return "The $60 price could not be resolved. Nothing was charged.";
  return "EMC_STRIPE_PRICE_MEMBER is not a Stripe price id. The $60 price was not charged.";
}

export class PriceConfigError extends Error {
  readonly plan: CheckoutPlan;

  constructor(plan: CheckoutPlan, reason: "missing" | "invalid") {
    super(priceFailureMessage(plan, reason));
    this.name = "PriceConfigError";
    this.plan = plan;
  }
}

export function isCheckoutPlan(value: string | null | undefined): value is CheckoutPlan {
  return value === "member" || value === "standard";
}

export function checkoutPlanFromKey(value: string): CheckoutPlan | null {
  if (value === "member" || value === EMC_MONTHLY) return "member";
  if (value === "standard" || value === EMC_GYM_MONTHLY) return "standard";
  return null;
}

export function planLookupKey(plan: CheckoutPlan): string {
  return plan === "member" ? EMC_MONTHLY : EMC_GYM_MONTHLY;
}

export function hasMembershipNumber(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/**
 * The price a checkout would charge. A self-declared current member is quoted
 * $60, never $120, unless staff have set the plan to standard (a lapse).
 * Whether the button is shown is checkoutOffer, not this function.
 * A membership number is not required.
 */
export function checkoutPlanFor(input: {
  gymMember: GymMember | null;
  membershipVerified: boolean;
  membershipNumber: string | null;
  staffPlan: CheckoutPlan | null;
}): CheckoutPlan {
  if (input.staffPlan === "standard") return "standard";
  if (input.gymMember === "current" && (input.membershipVerified || MEMBER_CHECKOUT_BEFORE_VERIFY)) return "member";
  if (input.gymMember === "current") return "member";
  return "standard";
}

export function staffCanChooseMember(input: {
  gymMember: GymMember | null;
  membershipVerified: boolean;
  membershipNumber: string | null;
}): boolean {
  return input.gymMember === "current" && input.membershipVerified;
}

export function needsMembershipVerification(input: {
  gymMember: GymMember | null;
  membershipVerified: boolean;
}): boolean {
  return input.gymMember === "current" && !input.membershipVerified;
}

export function staffPlanError(input: {
  gymMember: GymMember | null;
  membershipVerified: boolean;
  membershipNumber: string | null;
  staffPlan: CheckoutPlan;
}): string | null {
  if (input.staffPlan !== "member") return null;
  if (!staffCanChooseMember(input)) return VERIFY_MEMBERSHIP_NOTE;
  return null;
}

/** Flat $20 off each person for two months, then their own price. */
export function monthlyChargeCents(plan: CheckoutPlan, month: number, coupon: boolean): number {
  const base = plan === "member" ? MEMBER_PRICE_CENTS : STANDARD_PRICE_CENTS;
  if (coupon && month >= 1 && month <= SHIELDMATE_MONTHS) return base - SHIELDMATE_OFF_CENTS;
  return base;
}

/** Optional price id override. Unset means resolve the lookup key. A bad value fails closed. */
export function priceOverride(plan: CheckoutPlan, env: NodeJS.ProcessEnv = process.env): string | null {
  const key = plan === "member" ? MEMBER_PRICE_ENV : STANDARD_PRICE_ENV;
  const value = env[key]?.trim() ?? "";
  if (!value) return null;
  if (!PRICE_ID.test(value)) throw new PriceConfigError(plan, "invalid");
  return value;
}

type Priced = { id?: string | null; lookup_key?: string | null };

/** Record the price Stripe actually charged. Never substitutes the other price. */
export function basePlanFromPrices<T extends Priced>(
  prices: T[],
  env: NodeJS.ProcessEnv = process.env,
): { plan: CheckoutPlan; lookupKey: string; price: T } | null {
  const standardId = env[STANDARD_PRICE_ENV]?.trim() ?? "";
  const memberId = env[MEMBER_PRICE_ENV]?.trim() ?? "";
  if (standardId) {
    const found = prices.find((price) => price.id === standardId);
    if (found) return { plan: "standard", lookupKey: EMC_GYM_MONTHLY, price: found };
  }
  if (memberId) {
    const found = prices.find((price) => price.id === memberId);
    if (found) return { plan: "member", lookupKey: EMC_MONTHLY, price: found };
  }
  const gym = prices.find((price) => price.lookup_key === EMC_GYM_MONTHLY);
  if (gym) return { plan: "standard", lookupKey: EMC_GYM_MONTHLY, price: gym };
  const member = prices.find((price) => price.lookup_key === EMC_MONTHLY);
  if (member) return { plan: "member", lookupKey: EMC_MONTHLY, price: member };
  return null;
}

export { parseGymMember };
