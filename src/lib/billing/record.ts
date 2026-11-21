import { createAnonClient } from "@/lib/supabase/server";
import type { BillingWrite } from "@/lib/billing/types";

function appliedFlag(data: unknown): boolean {
  return Boolean(
    data && typeof data === "object" && "applied" in data && (data as { applied: unknown }).applied === true,
  );
}

/** The secret is the RPC argument. It is not stored on the event row. */
export async function recordBillingEvent(secret: string, write: BillingWrite): Promise<{ applied: boolean }> {
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
  return { applied: appliedFlag(data) };
}
