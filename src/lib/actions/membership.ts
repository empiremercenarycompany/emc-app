"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { actionClient, dbError, requireRole } from "@/lib/action-client";
import { buildMembershipCheckout, createHostedCheckout } from "@/lib/billing/checkout";
import { billingFlags } from "@/lib/billing/flags";
import { loadMembershipDecision } from "@/lib/billing/membership";
import { originFromHost } from "@/lib/billing/origin";
import { checkoutPlanFor, isCheckoutPlan, PriceConfigError, staffPlanError } from "@/lib/billing/price";
import { confirmedShieldmatePair } from "@/lib/billing/shieldmate-pair";
import { getStripe, isStripeCheckoutUrl, safeBillingMessage } from "@/lib/billing/stripe";
import { signResumeToken } from "@/lib/billing/resume-token";
import { NO_TIME_SUBJECT, OWNER_ALERT_EMAIL, noTimeNotice } from "@/lib/notify/no-time";
import { sendStaffNotice } from "@/lib/notify/staff-notice";
import { PAYMENT_STEP, VERIFY_MEMBERSHIP_NOTE } from "@/lib/rules/public-copy";
import { tableLabel } from "@/lib/rules/saturday-tables";
import type { ActionResult } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/dm/signups");
  revalidatePath("/profile");
}

export async function setMembershipVerified(formData: FormData): Promise<ActionResult> {
  const gate = await requireRole("staff");
  if (gate) return gate;
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const userId = String(formData.get("user_id") ?? "");
  if (!UUID.test(userId)) return { error: "Choose a player." };
  const { error: rpcError } = await supabase.rpc("set_membership_verification", {
    p_user_id: userId,
    p_verified: formData.get("verified") === "1",
  });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

/**
 * Staff could not place a paid recruit. Flags the row, shows it on the sign-up
 * page, and emails the owner. It does not charge, refund, or email the player.
 */
export async function markNoSaturdayTime(formData: FormData): Promise<ActionResult> {
  const gate = await requireRole("staff");
  if (gate) return gate;
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const userId = String(formData.get("user_id") ?? "");
  if (!UUID.test(userId)) return { error: "Choose a player." };
  const { error: rpcError } = await supabase.rpc("mark_no_saturday_time", { p_user_id: userId });
  const message = dbError(rpcError);
  if (message) return { error: message };
  const [profile, intake] = await Promise.all([
    supabase.from("profiles").select("email, display_name").eq("id", userId).maybeSingle(),
    supabase.from("player_intake").select("timeslot_id, table_starts_on").eq("user_id", userId).maybeSingle(),
  ]);
  const table =
    tableLabel(String(intake.data?.timeslot_id ?? ""), String(intake.data?.table_starts_on ?? "").slice(0, 10)) ?? "";
  await sendStaffNotice(
    NO_TIME_SUBJECT,
    noTimeNotice({
      email: String(profile.data?.email ?? ""),
      name: String(profile.data?.display_name ?? ""),
      table,
    }),
    OWNER_ALERT_EMAIL,
  );
  refresh();
  return { ok: true };
}

/**
 * A waitlisted player pays only after staff click this.
 * The email is the signed resume link. It is not the player confirmation mail,
 * and EMC_PLAYER_CONFIRMATION_EMAIL_ENABLED stays off. No SMTP password means no send.
 */
export async function sendSeatOpenedLink(formData: FormData): Promise<ActionResult> {
  const gate = await requireRole("staff");
  if (gate) return gate;
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const userId = String(formData.get("user_id") ?? "");
  if (!UUID.test(userId)) return { error: "Choose a player." };
  const opened = await supabase.rpc("open_waitlist_seat", { p_user_id: userId });
  const message = dbError(opened.error);
  if (message) return { error: message };
  const email = typeof opened.data === "object" && opened.data && "email" in opened.data
    ? String((opened.data as { email?: string }).email ?? "")
    : "";
  const token = signResumeToken(email);
  if (!token) return { error: "Could not build the payment link." };
  const requestHeaders = await headers();
  const origin = originFromHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto"),
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://emc.thegiantdungeonmaster.com",
  );
  const link = `${origin}/pay?token=${encodeURIComponent(token)}`;
  await sendStaffNotice(
    "A Saturday seat opened",
    [
      { label: "Pay link", value: link },
      { label: "Next", value: PAYMENT_STEP },
    ],
    email,
  );
  refresh();
  const mailed = Boolean(process.env.EMC_NOTIFY_SMTP_USER?.trim() && process.env.EMC_NOTIFY_SMTP_PASSWORD);
  return mailed
    ? { ok: true }
    : { ok: true, note: "Seat reserved. Email is not configured, so the link was not sent." };
}

/** A lapsed gym membership leaves the $60 price. The membership number stays for staff. */
export async function lapseGymMembership(formData: FormData): Promise<ActionResult> {
  const gate = await requireRole("staff");
  if (gate) return gate;
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const userId = String(formData.get("user_id") ?? "");
  if (!UUID.test(userId)) return { error: "Choose a player." };
  const { error: rpcError } = await supabase.rpc("lapse_gym_membership", { p_user_id: userId });
  const message = dbError(rpcError);
  if (message) return { error: message };
  refresh();
  return { ok: true };
}

export async function saveCheckoutPlan(formData: FormData): Promise<ActionResult & { url?: string }> {
  const gate = await requireRole("staff");
  if (gate) return gate;
  const { supabase, error } = await actionClient();
  if (!supabase || error) return { error: error ?? "Sign in first." };
  const userId = String(formData.get("user_id") ?? "");
  if (!UUID.test(userId)) return { error: "Choose a player." };
  const requested = String(formData.get("plan") ?? "");
  if (!isCheckoutPlan(requested)) return { error: "Choose a price." };

  const decision = await loadMembershipDecision(supabase, userId);
  const blocked = staffPlanError({ ...decision, staffPlan: requested });
  if (blocked) return { error: blocked };

  const { error: rpcError } = await supabase.rpc("set_checkout_plan", {
    p_user_id: userId,
    p_plan: requested,
  });
  const message = dbError(rpcError);
  if (message) return { error: message === "Verify membership before sending the $60 link" ? VERIFY_MEMBERSHIP_NOTE : message };
  refresh();

  if (formData.get("intent") !== "link") return { ok: true };

  const stripe = getStripe();
  if (!stripe) return { error: "Billing is not available right now." };
  const [profile, customer] = await Promise.all([
    supabase.from("profiles").select("email").eq("id", userId).maybeSingle(),
    supabase.from("billing_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
  ]);
  const flags = billingFlags();
  const headerList = await headers();
  const origin = originFromHost(headerList.get("x-forwarded-host") ?? headerList.get("host"), headerList.get("x-forwarded-proto") ?? "https", "http://localhost:3000");
  const plan = checkoutPlanFor({ ...decision, staffPlan: requested });
  let params;
  try {
    params = await buildMembershipCheckout(stripe, {
      plan,
      wanderlustRequested: false,
      wanderlustEnabled: false,
      couponEnabled: flags.coupon,
      pairConfirmed: flags.coupon ? await confirmedShieldmatePair(supabase, userId) : false,
      userId,
      email: typeof profile.data?.email === "string" ? profile.data.email : null,
      customerId: typeof customer.data?.stripe_customer_id === "string" ? customer.data.stripe_customer_id : null,
      origin,
    });
  } catch (caught) {
    if (caught instanceof PriceConfigError) return { error: caught.message };
    console.error(JSON.stringify({ source: "payment-link", result: "price", message: safeBillingMessage(caught) }));
    return { error: "Billing is not available right now." };
  }
  if (!params) return { error: "Choose a price." };
  try {
    const session = await createHostedCheckout(stripe, params);
    if (!isStripeCheckoutUrl(session.url)) return { error: "Billing is not available right now." };
    return { ok: true, url: session.url };
  } catch (caught) {
    console.error(JSON.stringify({ source: "payment-link", result: "session", message: safeBillingMessage(caught) }));
    return { error: "Billing is not available right now." };
  }
}
