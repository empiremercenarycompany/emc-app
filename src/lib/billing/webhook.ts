import Stripe from "stripe";
import { billingWriteFromEvent } from "@/lib/billing/normalize";
import { notifyStaffOfPayment } from "@/lib/billing/notices";
import { recordBillingEvent } from "@/lib/billing/record";
import { safeBillingMessage, stripeWebhookSecret } from "@/lib/billing/stripe";
import type { BillingWrite, StaffPaymentNotice } from "@/lib/billing/types";

export type BillingWebhookDeps = {
  secret: string | null;
  constructEvent: (payload: string, signature: string, secret: string) => Stripe.Event;
  record: (secret: string, write: BillingWrite) => Promise<{ applied: boolean }>;
  notify: (notice: StaffPaymentNotice) => Promise<void>;
};

export function defaultWebhookDeps(): BillingWebhookDeps {
  return {
    secret: stripeWebhookSecret(),
    constructEvent: (payload, signature, secret) => Stripe.webhooks.constructEvent(payload, signature, secret),
    record: recordBillingEvent,
    notify: notifyStaffOfPayment,
  };
}

function log(result: string, extra: Record<string, string>) {
  console.error(JSON.stringify({ source: "stripe-webhook", result, ...extra }));
}

/**
 * Verify the raw body, record the event once, then mail staff.
 * A second delivery of the same event id returns 200 and does not mail again.
 * A mail failure does not change the 200 once the event is recorded.
 */
export async function handleStripeWebhook(request: Request, deps: BillingWebhookDeps): Promise<Response> {
  if (!deps.secret) {
    log("rejected", { reason: "missing_secret" });
    return Response.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!signature || !payload) {
    log("rejected", { reason: "signature" });
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = deps.constructEvent(payload, signature, deps.secret);
  } catch {
    log("rejected", { reason: "signature" });
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const write = billingWriteFromEvent(event);
  if (!write) return Response.json({ received: true });

  let applied = false;
  try {
    const recorded = await deps.record(deps.secret, write);
    applied = recorded.applied;
  } catch (error) {
    const message = safeBillingMessage(error);
    const reason = message.includes("billing write refused") ? "write_secret" : "record";
    log("record_failed", {
      eventId: event.id,
      type: event.type,
      reason,
      ...(reason === "record" ? { message } : {}),
    });
    return Response.json({ error: "Could not record the event." }, { status: 500 });
  }

  if (applied && write.notice) {
    try {
      await deps.notify(write.notice);
    } catch {
      log("mail_failed", { eventId: event.id, type: event.type });
    }
  }

  return Response.json({ received: true });
}
