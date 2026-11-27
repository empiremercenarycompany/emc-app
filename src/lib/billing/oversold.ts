import type Stripe from "stripe";
import { soldSlotKey } from "@/lib/rules/seat-choice";
import { createAnonClient } from "@/lib/supabase/server";
import { normalizeSignupEmail } from "@/lib/billing/site-checkout";

export function paidSeatFromEvent(event: Stripe.Event): { email: string; slot: string } | null {
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data.object as Stripe.Checkout.Session;
  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) return null;
  const slot = soldSlotKey(session.metadata);
  const email =
    normalizeSignupEmail(session.metadata?.signup_email) ??
    normalizeSignupEmail(session.customer_email) ??
    normalizeSignupEmail(session.customer_details?.email);
  if (!slot || !email) return null;
  return { email, slot };
}

/** Keeps the payment. Returns true when this payer is past the six seats. */
export async function flagOversoldPayment(input: { secret: string; email: string; slot: string }): Promise<boolean> {
  const supabase = createAnonClient();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("note_oversold_payment", {
    p_secret: input.secret,
    p_email: input.email,
    p_slot: input.slot,
  });
  if (error) return false;
  return data === true;
}
