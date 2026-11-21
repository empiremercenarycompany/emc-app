import { NextResponse } from "next/server";
import { openBillingPortal } from "@/lib/billing/checkout";
import { appOrigin } from "@/lib/billing/origin";
import { loadOwnBilling } from "@/lib/billing/own-billing";
import { getStripe, safeBillingMessage } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = appOrigin(request);
  const back = (flag: string) => NextResponse.redirect(new URL(`/profile?billing=${flag}`, origin), 303);
  const supabase = await createClient();
  if (!supabase) return back("unavailable");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/sign-in", origin), 303);

  const stripe = getStripe();
  if (!stripe) return back("unavailable");
  const billing = await loadOwnBilling(supabase);
  const customerId = billing?.customer?.stripe_customer_id;
  if (!customerId) return back("portal");

  try {
    const portal = await openBillingPortal(stripe, customerId, `${origin}/profile`);
    if (!portal.ok) {
      console.error(JSON.stringify({ source: "billing-portal", result: portal.reason }));
      return back(portal.reason === "not-configured" ? "portal-config" : "unavailable");
    }
    return NextResponse.redirect(portal.url, 303);
  } catch (error) {
    console.error(JSON.stringify({ source: "billing-portal", result: "failed", message: safeBillingMessage(error) }));
    return back("unavailable");
  }
}
