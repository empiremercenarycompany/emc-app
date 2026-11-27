import { MEMBER_CHECKOUT_BEFORE_VERIFY } from "@/lib/billing/member-checkout";
import { canStartCheckout } from "@/lib/billing/own-billing";
import { checkoutPlanFor, type CheckoutPlan } from "@/lib/billing/price";
import { PAYMENT_STEP, type GymMember } from "@/lib/rules/public-copy";
import { WAITLIST_COPY } from "@/lib/rules/seat-choice";

export type CheckoutOffer =
  | { state: "pay"; plan: CheckoutPlan; button: string }
  | { state: "hold"; message: string }
  | { state: "closed"; message: string }
  | { state: "subscribed" };

const MEMBER_HOLD =
  "We're checking your Empire membership. You'll pay $60 a month once staff confirm it. Nothing is charged until then.";

const TEEN_CLOSED = "The teen waitlist doesn't take payment. If a teen squad starts, we'll let you know.";

const ENLIST_FIRST = `Save your enlistment first. Then: ${PAYMENT_STEP}`;

export function payButton(plan: CheckoutPlan): string {
  return plan === "member" ? "Pay $60/month" : "Pay $120/month";
}

/**
 * Pay first, then staff confirm the Saturday time. Checkout is not gated on
 * a staff-confirmed seat. Under 16 and the teen waitlist never get a button.
 * A self-declared current member is not shown $120 while verification is open,
 * unless MEMBER_CHECKOUT_BEFORE_VERIFY is true (then the button is Pay $60/month)
 * or staff have already set the plan to standard.
 */
export function checkoutOffer(input: {
  hasIntake: boolean;
  ageBand: string | null;
  teenWaitlist: boolean;
  gymMember: GymMember | null;
  membershipVerified: boolean;
  membershipNumber: string | null;
  staffPlan: CheckoutPlan | null;
  subscriptionStatus: string | null;
  heldChoice?: "first" | "second" | "waitlist" | null;
}): CheckoutOffer {
  if (!canStartCheckout(input.subscriptionStatus)) return { state: "subscribed" };
  if (input.teenWaitlist || input.ageBand === "under_16") return { state: "closed", message: TEEN_CLOSED };
  if (input.heldChoice === "waitlist") return { state: "closed", message: WAITLIST_COPY };
  if (!input.hasIntake) return { state: "closed", message: ENLIST_FIRST };
  const memberPending =
    input.gymMember === "current" && !input.membershipVerified && input.staffPlan !== "standard";
  if (memberPending && !MEMBER_CHECKOUT_BEFORE_VERIFY) return { state: "hold", message: MEMBER_HOLD };
  const plan = checkoutPlanFor(input);
  return { state: "pay", plan, button: payButton(plan) };
}
