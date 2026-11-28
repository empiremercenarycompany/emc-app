import Stripe from "stripe";
import { billingWriteFromEvent } from "@/lib/billing/normalize";
import { notifyStaffOfPayment } from "@/lib/billing/notices";
import { recordBillingEvent } from "@/lib/billing/record";
import { sendAppInvite } from "@/lib/billing/app-invite";
import { flagOversoldPayment, paidSeatFromEvent } from "@/lib/billing/oversold";
import { safeBillingMessage, stripeWebhookSecret } from "@/lib/billing/stripe";
import { NO_TIME_SUBJECT, OWNER_ALERT_EMAIL, noTimeNotice } from "@/lib/notify/no-time";
import { sendStaffNotice } from "@/lib/notify/staff-notice";
import type { BillingWrite, StaffPaymentNotice } from "@/lib/billing/types";

export type BillingWebhookDeps = {
  secret: string | null;
  constructEvent: (payload: string, signature: string, secret: string) => Stripe.Event;
  record: (secret: string, write: BillingWrite) => Promise<{ applied: boolean; invite?: boolean }>;
  notify: (notice: StaffPaymentNotice) => Promise<void>;
  /** Sends the app sign-in link after a paid site checkout. Tests omit it. */
  invite?: (email: string) => Promise<void>;
  /** Re-check the sold Saturday table. A full table keeps the payment and flags staff. */
  flagNoTime?: (input: { secret: string; email: string; slot: string }) => Promise<boolean>;
};

export function defaultWebhookDeps(): BillingWebhookDeps {
  return {
    secret: stripeWebhookSecret(),
    constructEvent: (payload, signature, secret) => Stripe.webhooks.constructEvent(payload, signature, secret),
    record: recordBillingEvent,
    notify: notifyStaffOfPayment,
    invite: sendAppInvite,
    flagNoTime: flagOversoldPayment,
  };
}

async function mailNoTime(input: { email: string; slot: string }) {
  await sendStaffNotice(
    NO_TIME_SUBJECT,
    noTimeNotice({ email: input.email, name: "", table: input.slot }),
    OWNER_ALERT_EMAIL,
  );
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
  let sendInvite = false;
  try {
    const recorded = await deps.record(deps.secret, write);
    applied = recorded.applied;
    sendInvite = recorded.invite === true;
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

  if (sendInvite && write.site && deps.invite) {
    try {
      await deps.invite(write.site.email);
    } catch (error) {
      log("invite_failed", { eventId: event.id, type: event.type, message: safeBillingMessage(error) });
    }
  }

  if (applied && deps.flagNoTime) {
    const seat = paidSeatFromEvent(event);
    if (seat) {
      try {
        const oversold = await deps.flagNoTime({ secret: deps.secret, email: seat.email, slot: seat.slot });
        if (oversold) await mailNoTime(seat);
      } catch (error) {
        log("no_time_failed", { eventId: event.id, type: event.type, message: safeBillingMessage(error) });
      }
    }
  }

  return Response.json({ received: true });
}
