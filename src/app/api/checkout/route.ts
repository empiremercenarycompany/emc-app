import { NextResponse } from "next/server";
import { billingFlags } from "@/lib/billing/flags";
import { appOrigin } from "@/lib/billing/origin";
import { buildMembershipCheckout, createHostedCheckout } from "@/lib/billing/checkout";
import { loadMembershipDecision } from "@/lib/billing/membership";
import { loadOwnBilling } from "@/lib/billing/own-billing";
import { checkoutOffer } from "@/lib/billing/checkout-offer";
import { PriceConfigError } from "@/lib/billing/price";
import { confirmedShieldmatePair } from "@/lib/billing/shieldmate-pair";
import { getStripe, isStripeCheckoutUrl, safeBillingMessage } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed-in users only. Card numbers stay on Stripe-hosted Checkout. */
export async function POST(request: Request) {
  const origin = appOrigin(request);
  const back = (flag: string) => NextResponse.redirect(new URL(`/profile?billing=${flag}`, origin), 303);
  const supabase = await createClient();
  if (!supabase) return back("unavailable");
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.redirect(new URL("/sign-in", origin), 303);

  const stripe = getStripe();
  if (!stripe) return back("unavailable");

  const form = await request.formData();
  const flags = billingFlags();
  const billing = await loadOwnBilling(supabase);
  const decision = await loadMembershipDecision(supabase, user.id);
  const offer = checkoutOffer({
    hasIntake: decision.hasIntake,
    ageBand: decision.ageBand,
    teenWaitlist: decision.teenWaitlist,
    gymMember: decision.gymMember,
    membershipVerified: decision.membershipVerified,
    membershipNumber: decision.membershipNumber,
    staffPlan: decision.staffPlan,
    subscriptionStatus: billing?.subscription?.status ?? null,
    heldChoice: decision.heldChoice,
  });
  if (offer.state === "hold") return back("hold");
  if (offer.state !== "pay") {
    if (decision.heldChoice === "waitlist" && !decision.teenWaitlist && decision.ageBand !== "under_16") {
      return back("waitlist");
    }
    return back("closed");
  }
  const pairConfirmed = flags.coupon ? await confirmedShieldmatePair(supabase, user.id) : false;
  let params;
  try {
    params = await buildMembershipCheckout(stripe, {
      plan: offer.plan,
      wanderlustRequested: form.get("wanderlust") === "1",
      wanderlustEnabled: flags.wanderlust,
      couponEnabled: flags.coupon,
      pairConfirmed,
      userId: user.id,
      email: user.email ?? null,
      customerId: billing?.customer?.stripe_customer_id ?? null,
      origin,
      preferredSlot: decision.preferredSlot,
      preferredSlot2: decision.preferredSlot2,
      checkoutSlot: decision.heldChoice === "second" ? "second" : "first",
    });
  } catch (error) {
    if (error instanceof PriceConfigError) return back(error.plan === "standard" ? "price-standard" : "price-member");
    console.error(JSON.stringify({ source: "checkout", result: "price", message: safeBillingMessage(error) }));
    return back("unavailable");
  }
  if (!params) return back("plan");

  try {
    const session = await createHostedCheckout(stripe, params);
    if (!isStripeCheckoutUrl(session.url)) return back("unavailable");
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error(JSON.stringify({ source: "checkout", result: "session", message: safeBillingMessage(error) }));
    return back("unavailable");
  }
}
