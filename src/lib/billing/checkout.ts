import type Stripe from "stripe";
import { SHIELDMATE_COUPON_ID, WANDERLUST_ADDON, isBasePlan, type BasePlan } from "@/lib/billing/plans";
import { isMissingResource, isStripeCheckoutUrl, isStripePortalUrl, portalFailureReason } from "@/lib/billing/stripe";

export type CheckoutSelection = {
  plan: BasePlan;
  lookupKeys: string[];
  coupon: string | null;
};

/**
 * Wanderlust is an extra line, never the base plan.
 * The Shieldmate coupon is applied only when its flag is on. John has not narrowed who is eligible.
 */
export function checkoutSelection(input: {
  plan: string;
  wanderlustRequested: boolean;
  wanderlustEnabled: boolean;
  couponEnabled: boolean;
}): CheckoutSelection | null {
  if (!isBasePlan(input.plan)) return null;
  const lookupKeys: string[] = [input.plan];
  if (input.wanderlustEnabled && input.wanderlustRequested) lookupKeys.push(WANDERLUST_ADDON);
  return {
    plan: input.plan,
    lookupKeys,
    coupon: input.couponEnabled ? SHIELDMATE_COUPON_ID : null,
  };
}

export async function resolveLookupPrices(stripe: Stripe, lookupKeys: string[]): Promise<string[]> {
  const listed = await stripe.prices.list({ lookup_keys: lookupKeys, active: true, limit: 10 });
  return lookupKeys.map((key) => {
    const price = listed.data.find((row) => row.lookup_key === key && row.active);
    if (!price) throw new Error(`No active price for lookup key ${key}`);
    return price.id;
  });
}

export function membershipCheckoutParams(input: {
  selection: CheckoutSelection;
  priceIds: string[];
  userId: string;
  email: string | null;
  customerId: string | null;
  origin: string;
}): Stripe.Checkout.SessionCreateParams {
  const wanderlust = input.selection.lookupKeys.includes(WANDERLUST_ADDON);
  const metadata: Record<string, string> = {
    surface: "app",
    plan: input.selection.plan,
    user_id: input.userId,
  };
  if (wanderlust) metadata.wanderlust = "true";
  if (input.selection.coupon) metadata.coupon = input.selection.coupon;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    client_reference_id: input.userId,
    line_items: input.priceIds.map((price) => ({ price, quantity: 1 })),
    success_url: `${input.origin}/profile?billing=success`,
    cancel_url: `${input.origin}/profile?billing=cancel`,
    metadata,
    subscription_data: { metadata },
  };
  if (input.customerId) params.customer = input.customerId;
  else if (input.email) params.customer_email = input.email;
  if (input.selection.coupon) params.discounts = [{ coupon: input.selection.coupon }];
  return params;
}

export async function buildMembershipCheckout(
  stripe: Stripe,
  input: {
    plan: string;
    wanderlustRequested: boolean;
    wanderlustEnabled: boolean;
    couponEnabled: boolean;
    userId: string;
    email: string | null;
    customerId: string | null;
    origin: string;
  },
): Promise<Stripe.Checkout.SessionCreateParams | null> {
  const selection = checkoutSelection(input);
  if (!selection) return null;
  const priceIds = await resolveLookupPrices(stripe, selection.lookupKeys);
  return membershipCheckoutParams({
    selection,
    priceIds,
    userId: input.userId,
    email: input.email,
    customerId: input.customerId,
    origin: input.origin,
  });
}

/** A deleted customer is retried once without that id. Card data stays on Stripe. */
export async function createHostedCheckout(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams,
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.create(params);
  } catch (error) {
    if (!params.customer || !isMissingResource(error)) throw error;
    const retry = { ...params };
    delete retry.customer;
    return stripe.checkout.sessions.create(retry);
  }
}

export async function openBillingPortal(
  stripe: Stripe,
  customerId: string,
  returnUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; reason: "not-configured" | "unavailable" }> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    if (!isStripePortalUrl(session.url)) return { ok: false, reason: "unavailable" };
    return { ok: true, url: session.url };
  } catch (error) {
    return { ok: false, reason: portalFailureReason(error) };
  }
}

export { isStripeCheckoutUrl };
