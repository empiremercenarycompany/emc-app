import { createAnonClient } from "@/lib/supabase/server";
import type { BillingWrite } from "@/lib/billing/types";

function appliedFlag(data: unknown): boolean {
  return Boolean(
    data && typeof data === "object" && "applied" in data && (data as { applied: unknown }).applied === true,
  );
}

/** The secret is the RPC argument. It is not stored on the event row. */
export async function recordBillingEvent(
  secret: string,
  write: BillingWrite,
): Promise<{ applied: boolean; invite: boolean }> {
  const supabase = createAnonClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("apply_billing_event", {
    p_secret: secret,
    p_event: {
      id: write.id,
      type: write.type,
      created: write.created,
      raw: write.raw,
      customer: write.customer,
      subscription: write.subscription,
    },
  });
  if (error) throw new Error(error.message);
  let invite = false;
  if (write.site) {
    const site = await supabase.rpc("record_site_checkout", {
      p_secret: secret,
      p_record: {
        email: write.site.email,
        status: write.site.status,
        plan: write.site.plan,
        metadata: write.site.metadata,
        stripe_customer_id: write.site.stripeCustomerId,
        stripe_subscription_id: write.site.stripeSubscriptionId,
        checkout_session_id: write.site.checkoutSessionId,
        invite: write.site.invite,
      },
    });
    if (site.error) throw new Error(site.error.message);
    invite = Boolean(
      site.data && typeof site.data === "object" && "invite" in site.data && (site.data as { invite?: unknown }).invite === true,
    );
  }
  return { applied: appliedFlag(data), invite };
}
