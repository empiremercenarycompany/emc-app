import type Stripe from "stripe";
import { basePlanFromPrices } from "@/lib/billing/price";
import { SHIELDMATE_COUPON_ID, WANDERLUST_ADDON } from "@/lib/billing/plans";
import {
  isTeenWaitlist,
  normalizeSignupEmail,
  siteLookupKey,
  siteMetadataFromUnknown,
  sitePlanFor,
} from "@/lib/billing/site-checkout";
import type { SiteCheckoutWrite } from "@/lib/billing/types";
import type {
  BillingCustomerWrite,
  BillingEventType,
  BillingSubscriptionWrite,
  BillingWrite,
  StaffPaymentNotice,
} from "@/lib/billing/types";
import { BILLING_EVENT_TYPES } from "@/lib/billing/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return typeof value.id === "string" ? value.id : null;
}

/**
 * App checkout stores the auth uid.
 * Site checkout has no signup id. The player is matched later by email.
 */
export function linkIds(
  metadata: Stripe.Metadata | null | undefined,
  clientReferenceId: string | null | undefined,
): { userId: string | null; signupId: string | null } {
  const surface = metadata?.surface ?? "";
  const metaUser = uuidOrNull(metadata?.user_id);
  const metaSignup = uuidOrNull(metadata?.signup_id);
  const ref = uuidOrNull(clientReferenceId);
  if (surface === "site") return { userId: null, signupId: null };
  return { userId: metaUser ?? ref, signupId: metaSignup };
}

function siteCheckoutWrite(
  metadata: Stripe.Metadata | null | undefined,
  extras: {
    email?: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    checkoutSessionId: string | null;
    paid: boolean;
  },
): SiteCheckoutWrite | null {
  if ((metadata?.surface ?? "") !== "site" || !extras.paid) return null;
  const parsed = siteMetadataFromUnknown(metadata);
  const email = normalizeSignupEmail(parsed.signup_email) ?? normalizeSignupEmail(extras.email);
  if (!email) return null;
  parsed.signup_email = email;
  const plan = sitePlanFor(parsed.gym_member, parsed.plan);
  parsed.plan = siteLookupKey(plan);
  const teen = isTeenWaitlist({ ageGroup: parsed.age_group });
  return {
    email,
    status: "paid",
    plan: parsed.plan,
    metadata: parsed,
    stripeCustomerId: extras.stripeCustomerId,
    stripeSubscriptionId: extras.stripeSubscriptionId,
    checkoutSessionId: extras.checkoutSessionId,
    invite: !teen,
  };
}

function centsFromMetadata(metadata: Stripe.Metadata | null | undefined): number | null {
  const raw = metadata?.gym_share_cents?.trim() ?? "";
  if (!/^\d{1,9}$/.test(raw)) return null;
  return Number(raw);
}

function partnerFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  const partner = metadata?.gym_partner?.trim() ?? "";
  return partner ? partner.slice(0, 40) : null;
}

export function normalizeSubscription(subscription: Stripe.Subscription): BillingSubscriptionWrite | null {
  const customerId = stripeId(subscription.customer);
  if (!customerId) return null;
  const prices = (subscription.items?.data ?? []).map((item) => item.price);
  const wanderlust = prices.some((price) => price.lookup_key === WANDERLUST_ADDON);
  const matched = basePlanFromPrices(prices);
  const base =
    matched?.price ??
    prices.find((price) => price.lookup_key && price.lookup_key !== WANDERLUST_ADDON) ??
    null;
  const plan = matched?.lookupKey ?? base?.lookup_key ?? "unknown";
  const ends = (subscription.items?.data ?? [])
    .map((item) => item.current_period_end)
    .filter((value) => Number.isFinite(value));
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  if (typeof legacy === "number") ends.push(legacy);
  const links = linkIds(subscription.metadata, null);
  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    user_id: links.userId,
    signup_id: links.signupId,
    plan_lookup_key: plan,
    status: subscription.status,
    current_period_end: ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end === true,
    wanderlust,
    gym_share_cents: centsFromMetadata(base && "metadata" in base ? base.metadata : null),
    gym_partner: partnerFromMetadata(base && "metadata" in base ? base.metadata : null),
  };
}

function customerWrite(
  stripeCustomerId: string | null,
  links: { userId: string | null; signupId: string | null },
  email: string | null,
): BillingCustomerWrite | null {
  if (!stripeCustomerId) return null;
  return {
    stripe_customer_id: stripeCustomerId,
    user_id: links.userId,
    signup_id: links.signupId,
    email,
  };
}

function couponId(discount: Stripe.Discount | Stripe.DeletedDiscount | string): string | null {
  if (typeof discount === "string") return null;
  const coupon = discount.source?.coupon;
  if (!coupon) return null;
  return typeof coupon === "string" ? coupon : coupon.id;
}

function isHandled(type: string): type is BillingEventType {
  return (BILLING_EVENT_TYPES as readonly string[]).includes(type);
}

function fromCheckout(event: Stripe.Event): BillingWrite | null {
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data.object;
  const links = linkIds(session.metadata, session.client_reference_id);
  const email = session.metadata?.signup_email ?? session.customer_details?.email ?? session.customer_email ?? null;
  const expanded = session.subscription && typeof session.subscription !== "string" ? session.subscription : null;
  const subscription = expanded ? normalizeSubscription(expanded) : null;
  const paid = session.payment_status === "paid" || session.status === "complete";
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    raw: event,
    customer: customerWrite(stripeId(session.customer), links, email),
    subscription,
    notice: null,
    site: siteCheckoutWrite(session.metadata, {
      email,
      stripeCustomerId: stripeId(session.customer),
      stripeSubscriptionId: stripeId(session.subscription),
      checkoutSessionId: session.id,
      paid,
    }),
  };
}

function fromSubscription(event: Stripe.Event): BillingWrite | null {
  if (
    event.type !== "customer.subscription.created" &&
    event.type !== "customer.subscription.updated" &&
    event.type !== "customer.subscription.deleted"
  ) {
    return null;
  }
  const subscription = normalizeSubscription(event.data.object);
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    raw: event,
    customer: subscription
      ? customerWrite(
          subscription.stripe_customer_id,
          { userId: subscription.user_id, signupId: subscription.signup_id },
          event.data.object.metadata?.signup_email ?? null,
        )
      : null,
    subscription,
    notice: null,
    site: siteCheckoutWrite(event.data.object.metadata, {
      email: event.data.object.metadata?.signup_email ?? null,
      stripeCustomerId: subscription?.stripe_customer_id ?? stripeId(event.data.object.customer),
      stripeSubscriptionId: event.data.object.id,
      checkoutSessionId: null,
      paid: event.data.object.status === "active" || event.data.object.status === "trialing",
    }),
  };
}

function fromInvoice(event: Stripe.Event): BillingWrite | null {
  if (event.type !== "invoice.paid" && event.type !== "invoice.payment_failed") return null;
  const invoice = event.data.object;
  const details = invoice.parent?.subscription_details ?? null;
  const metadata = details?.metadata ?? null;
  const links = linkIds(metadata, null);
  const subscriptionId = stripeId(details?.subscription ?? null);
  const wanderlust = metadata?.wanderlust === "true";
  const shieldmate =
    metadata?.coupon === SHIELDMATE_COUPON_ID ||
    (invoice.discounts ?? []).some((discount) => couponId(discount) === SHIELDMATE_COUPON_ID);
  const notice: StaffPaymentNotice = {
    kind: event.type === "invoice.paid" ? "paid" : "failed",
    email: invoice.customer_email ?? null,
    userId: links.userId,
    planLookupKey: metadata?.plan?.trim() || null,
    invoiceId: invoice.id,
    subscriptionId,
    wanderlust,
    shieldmate,
  };
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    raw: event,
    customer: customerWrite(stripeId(invoice.customer), links, invoice.customer_email ?? null),
    subscription: null,
    notice,
    site: null,
  };
}

export function billingWriteFromEvent(event: Stripe.Event): BillingWrite | null {
  if (!isHandled(event.type)) return null;
  if (event.type === "checkout.session.completed") return fromCheckout(event);
  if (event.type.startsWith("customer.subscription.")) return fromSubscription(event);
  return fromInvoice(event);
}
