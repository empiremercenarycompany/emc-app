import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const ownBillingSchema = z.object({
  customer: z
    .object({
      stripe_customer_id: z.string().min(1),
    })
    .nullable(),
  subscription: z
    .object({
      stripe_subscription_id: z.string().min(1),
      plan_lookup_key: z.string().min(1),
      status: z.string().min(1),
      current_period_end: z.string().nullable(),
      cancel_at_period_end: z.boolean(),
      wanderlust: z.boolean(),
    })
    .nullable(),
});

export type OwnBilling = z.infer<typeof ownBillingSchema>;

export function parseOwnBilling(data: unknown): OwnBilling | null {
  const parsed = ownBillingSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Null means the read failed. An empty membership is a successful object with nulls. */
export async function loadOwnBilling(supabase: SupabaseClient): Promise<OwnBilling | null> {
  const { data, error } = await supabase.rpc("my_billing");
  if (error) return null;
  return parseOwnBilling(data);
}

const BLOCKED = new Set(["active", "trialing", "past_due", "unpaid", "paused", "incomplete"]);

export function canStartCheckout(status: string | null): boolean {
  if (!status) return true;
  return !BLOCKED.has(status);
}
