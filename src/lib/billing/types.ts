import type Stripe from "stripe";

export const BILLING_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export type BillingCustomerWrite = {
  stripe_customer_id: string;
  user_id: string | null;
  signup_id: string | null;
  email: string | null;
};

export type BillingSubscriptionWrite = {
  stripe_subscription_id: string;
  stripe_customer_id: string;
  user_id: string | null;
  signup_id: string | null;
  plan_lookup_key: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  wanderlust: boolean;
  gym_share_cents: number | null;
  gym_partner: string | null;
};

export type StaffPaymentNotice = {
  kind: "paid" | "failed";
  email: string | null;
  userId: string | null;
  planLookupKey: string | null;
  invoiceId: string | null;
  subscriptionId: string | null;
  wanderlust: boolean;
  shieldmate: boolean;
};

/** Wire shape for apply_billing_event. The webhook secret is a separate argument. */
export type BillingWrite = {
  id: string;
  type: BillingEventType;
  created: number;
  raw: Stripe.Event;
  customer: BillingCustomerWrite | null;
  subscription: BillingSubscriptionWrite | null;
  notice: StaffPaymentNotice | null;
};
