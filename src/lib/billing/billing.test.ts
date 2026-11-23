import { readFileSync } from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMembershipCheckout, checkoutSelection, createHostedCheckout, openBillingPortal } from "@/lib/billing/checkout";
import { formatPeriodEnd, statusLabel } from "@/lib/billing/display";
import { billingFlagEnabled } from "@/lib/billing/flags";
import { billingWriteFromEvent } from "@/lib/billing/normalize";
import { billingQueryNotice, paymentNotice } from "@/lib/billing/notices";
import { appOrigin } from "@/lib/billing/origin";
import { canStartCheckout, parseOwnBilling } from "@/lib/billing/own-billing";
import { portalFailureReason, safeBillingMessage } from "@/lib/billing/stripe";
import { handleStripeWebhook, type BillingWebhookDeps } from "@/lib/billing/webhook";

const ROOT = path.resolve(__dirname, "../../..");
const USER = "11111111-1111-4111-8111-111111111111";
const SIGNUP = "22222222-2222-4222-8222-222222222222";
const SECRET = "whsec_test_secret_value";

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

function invoiceEvent(id: string, type: "invoice.paid" | "invoice.payment_failed" = "invoice.paid") {
  return {
    id,
    object: "event",
    type,
    created: 1763760000,
    livemode: false,
    data: {
      object: {
        id: "in_test",
        object: "invoice",
        customer: "cus_test",
        customer_email: "member@example.test",
        discounts: [],
        parent: {
          type: "subscription_details",
          quote_details: null,
          subscription_details: {
            subscription: "sub_test",
            metadata: {
              surface: "app",
              plan: "emc_monthly",
              user_id: USER,
              wanderlust: "true",
              coupon: "shieldmate_20x2",
            },
          },
        },
      },
    },
  };
}

function signedRequest(payload: string, signature: string): Request {
  return new Request("https://app.example/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

function deps(overrides: Partial<BillingWebhookDeps> = {}): BillingWebhookDeps {
  return {
    secret: SECRET,
    constructEvent: (payload, signature, secret) => Stripe.webhooks.constructEvent(payload, signature, secret),
    record: vi.fn().mockResolvedValue({ applied: true }),
    notify: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("billing flags and checkout", () => {
  it("treats only true and 1 as on", () => {
    expect(billingFlagEnabled(undefined)).toBe(false);
    expect(billingFlagEnabled("")).toBe(false);
    expect(billingFlagEnabled("false")).toBe(false);
    expect(billingFlagEnabled("TRUE")).toBe(false);
    expect(billingFlagEnabled("yes")).toBe(false);
    expect(billingFlagEnabled("true")).toBe(true);
    expect(billingFlagEnabled("1")).toBe(true);
  });

  it("leaves wanderlust and the shieldmate coupon off unless those flags are on", async () => {
    const seen: string[][] = [];
    const stripe = {
      prices: {
        list: async ({ lookup_keys }: { lookup_keys: string[] }) => {
          seen.push(lookup_keys);
          return { data: lookup_keys.map((key) => ({ id: `price_for_${key}`, lookup_key: key, active: true })) };
        },
      },
    } as unknown as Stripe;

    const off = checkoutSelection({
      plan: "emc_monthly",
      wanderlustRequested: true,
      wanderlustEnabled: false,
      couponEnabled: false,
      pairConfirmed: true,
    });
    expect(off).toEqual({ plan: "emc_monthly", lookupKeys: ["emc_monthly"], coupon: null });

    const params = await buildMembershipCheckout(stripe, {
      plan: "emc_monthly",
      wanderlustRequested: true,
      wanderlustEnabled: false,
      couponEnabled: false,
      pairConfirmed: true,
      userId: USER,
      email: "member@example.test",
      customerId: "cus_existing",
      origin: "https://preview.example",
    });
    expect(seen).toEqual([["emc_monthly"]]);
    expect(params?.mode).toBe("subscription");
    expect(params?.customer).toBe("cus_existing");
    expect(params?.customer_email).toBeUndefined();
    expect(params?.client_reference_id).toBe(USER);
    expect(params?.metadata).toMatchObject({ surface: "app", plan: "emc_monthly", user_id: USER });
    expect(params?.discounts).toBeUndefined();
    expect(params?.line_items).toEqual([{ price: "price_for_emc_monthly", quantity: 1 }]);
    expect(params?.success_url).toBe("https://preview.example/profile?billing=success");
    expect(JSON.stringify(params)).not.toContain("transfer_data");
    expect(JSON.stringify(params)).not.toContain("wanderlust");
    expect(JSON.stringify(params)).not.toContain("shieldmate");
  });

  it("adds wanderlust as an extra line and applies the coupon only for a confirmed pair", async () => {
    const stripe = {
      prices: {
        list: async ({ lookup_keys }: { lookup_keys: string[] }) => ({
          data: lookup_keys.map((key) => ({ id: `price_for_${key}`, lookup_key: key, active: true })),
        }),
      },
    } as unknown as Stripe;
    const open = await buildMembershipCheckout(stripe, {
      plan: "emc_gym_monthly",
      wanderlustRequested: true,
      wanderlustEnabled: true,
      couponEnabled: true,
      pairConfirmed: false,
      userId: USER,
      email: "member@example.test",
      customerId: null,
      origin: "https://preview.example",
    });
    expect(open?.discounts).toBeUndefined();
    expect(JSON.stringify(open)).not.toContain("shieldmate");

    const params = await buildMembershipCheckout(stripe, {
      plan: "emc_gym_monthly",
      wanderlustRequested: true,
      wanderlustEnabled: true,
      couponEnabled: true,
      pairConfirmed: true,
      userId: USER,
      email: "member@example.test",
      customerId: null,
      origin: "https://preview.example",
    });
    expect(params?.line_items).toEqual([
      { price: "price_for_emc_gym_monthly", quantity: 1 },
      { price: "price_for_wanderlust_addon_monthly", quantity: 1 },
    ]);
    expect(params?.discounts).toEqual([{ coupon: "shieldmate_20x2" }]);
    expect(params?.customer_email).toBe("member@example.test");
    expect(params?.subscription_data?.metadata).toMatchObject({
      plan: "emc_gym_monthly",
      wanderlust: "true",
      coupon: "shieldmate_20x2",
    });
  });

  it("does not sell wanderlust as the base plan", async () => {
    const stripe = { prices: { list: vi.fn() } } as unknown as Stripe;
    const params = await buildMembershipCheckout(stripe, {
      plan: "wanderlust_addon_monthly",
      wanderlustRequested: true,
      wanderlustEnabled: true,
      couponEnabled: true,
      pairConfirmed: true,
      userId: USER,
      email: null,
      customerId: null,
      origin: "https://preview.example",
    });
    expect(params).toBeNull();
    expect(stripe.prices.list).not.toHaveBeenCalled();
  });

  it("retries checkout once when the stored customer is gone", async () => {
    const created: Stripe.Checkout.SessionCreateParams[] = [];
    const stripe = {
      checkout: {
        sessions: {
          create: async (params: Stripe.Checkout.SessionCreateParams) => {
            created.push(params);
            if (created.length === 1) {
              const error = new Error("No such customer: cus_gone") as Error & { code: string };
              error.code = "resource_missing";
              throw error;
            }
            return { id: "cs_test", url: "https://checkout.stripe.com/c/pay/cs_test" } as Stripe.Checkout.Session;
          },
        },
      },
    } as unknown as Stripe;
    const session = await createHostedCheckout(stripe, {
      mode: "subscription",
      customer: "cus_gone",
      line_items: [{ price: "price_for_emc_monthly", quantity: 1 }],
    });
    expect(session.url).toBe("https://checkout.stripe.com/c/pay/cs_test");
    expect(created[1]?.customer).toBeUndefined();
  });
});

describe("stripe webhook", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects a missing webhook secret without logging it", async () => {
    vi.stubEnv("EMC_STRIPE_WEBHOOK_SECRET", SECRET);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleStripeWebhook(signedRequest("{}", "t=1,v1=nope"), deps({ secret: null }));
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).not.toContain("whsec_");
    expect(error.mock.calls.flat().join(" ")).not.toContain(SECRET);
  });

  it("rejects a bad signature and does not record or mail", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const record = vi.fn();
    const notify = vi.fn();
    const payload = JSON.stringify(invoiceEvent("evt_bad"));
    const response = await handleStripeWebhook(
      signedRequest(payload, "t=1,v1=deadbeef"),
      deps({ record, notify }),
    );
    expect(response.status).toBe(400);
    expect(record).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(error.mock.calls.flat().join(" ")).not.toContain("member@example.test");
    expect(error.mock.calls.flat().join(" ")).not.toContain(SECRET);
  });

  it("records a signed event once and does not mail again on replay", async () => {
    const payload = JSON.stringify(invoiceEvent("evt_replay"));
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const record = vi
      .fn()
      .mockResolvedValueOnce({ applied: true })
      .mockResolvedValueOnce({ applied: false });
    const notify = vi.fn().mockResolvedValue(undefined);
    const webhookDeps = deps({ record, notify });
    const first = await handleStripeWebhook(signedRequest(payload, signature), webhookDeps);
    const second = await handleStripeWebhook(signedRequest(payload, signature), webhookDeps);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(record).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "paid",
        email: "member@example.test",
        userId: USER,
        planLookupKey: "emc_monthly",
        invoiceId: "in_test",
        subscriptionId: "sub_test",
        wanderlust: true,
        shieldmate: true,
      }),
    );
    const stored = JSON.stringify(record.mock.calls[0]?.[1]);
    expect(stored).toContain("evt_replay");
    expect(stored).not.toContain(SECRET);
    expect(record.mock.calls[0]?.[0]).toBe(SECRET);
  });

  it("returns 200 when staff mail throws after the event is recorded", async () => {
    const payload = JSON.stringify(invoiceEvent("evt_mail", "invoice.payment_failed"));
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleStripeWebhook(
      signedRequest(payload, signature),
      deps({
        record: vi.fn().mockResolvedValue({ applied: true }),
        notify: vi.fn().mockRejectedValue(new Error("smtp down")),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("ignores events outside the six billing types", async () => {
    const payload = JSON.stringify({ id: "evt_other", object: "event", type: "charge.succeeded", created: 1, data: { object: {} } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const record = vi.fn();
    const response = await handleStripeWebhook(signedRequest(payload, signature), deps({ record }));
    expect(response.status).toBe(200);
    expect(record).not.toHaveBeenCalled();
  });
});

describe("billing event normalize", () => {
  it("stores gym metadata and the wanderlust line without creating a payout", () => {
    const write = billingWriteFromEvent({
      id: "evt_sub",
      object: "event",
      type: "customer.subscription.updated",
      created: 1763760000,
      data: {
        object: {
          id: "sub_gym",
          object: "subscription",
          customer: "cus_gym",
          status: "active",
          cancel_at_period_end: true,
          metadata: { surface: "app", user_id: USER, plan: "emc_gym_monthly" },
          items: {
            object: "list",
            data: [
              {
                current_period_end: 1764547200,
                price: {
                  id: "price_gym",
                  lookup_key: "emc_gym_monthly",
                  metadata: { gym_share_cents: "6000", gym_partner: "empire" },
                },
              },
              {
                current_period_end: 1764633600,
                price: { id: "price_add", lookup_key: "wanderlust_addon_monthly", metadata: {} },
              },
            ],
          },
        },
      },
    } as unknown as Stripe.Event);
    expect(write?.subscription).toMatchObject({
      stripe_subscription_id: "sub_gym",
      stripe_customer_id: "cus_gym",
      user_id: USER,
      plan_lookup_key: "emc_gym_monthly",
      status: "active",
      cancel_at_period_end: true,
      wanderlust: true,
      gym_share_cents: 6000,
      gym_partner: "empire",
      current_period_end: new Date(1764633600 * 1000).toISOString(),
    });
    expect(JSON.stringify(write?.subscription)).not.toContain("transfer");
  });

  it("links an app checkout to the auth uid and a site checkout to the signup id", () => {
    const app = billingWriteFromEvent({
      id: "evt_app",
      object: "event",
      type: "checkout.session.completed",
      created: 1763760000,
      data: {
        object: {
          object: "checkout.session",
          client_reference_id: USER,
          customer: "cus_app",
          customer_email: "member@example.test",
          customer_details: { email: "member@example.test" },
          subscription: "sub_later",
          metadata: { surface: "app", plan: "emc_monthly", user_id: USER },
        },
      },
    } as unknown as Stripe.Event);
    expect(app?.customer).toMatchObject({ stripe_customer_id: "cus_app", user_id: USER, signup_id: null });
    expect(app?.subscription).toBeNull();
    expect(app?.notice).toBeNull();

    const site = billingWriteFromEvent({
      id: "evt_site",
      object: "event",
      type: "checkout.session.completed",
      created: 1763760000,
      data: {
        object: {
          object: "checkout.session",
          client_reference_id: SIGNUP,
          customer: "cus_site",
          metadata: { surface: "site" },
        },
      },
    } as unknown as Stripe.Event);
    expect(site?.customer).toMatchObject({ user_id: null, signup_id: SIGNUP });
  });
});

describe("membership copy and portal", () => {
  it("names the plans, the venue, and the staff mail without banned words", () => {
    const panel = read("src/components/membership-panel.tsx");
    const plans = read("src/lib/billing/plans.ts");
    const profile = read("src/app/profile/page.tsx");
    expect(plans).toContain("Empire Strength and Fitness");
    expect(plans).toContain("$60 a month");
    expect(plans).toContain("$120 a month");
    expect(panel).toContain("PLAN_CHOICES");
    expect(panel).toContain("wanderlustEnabled");
    expect(panel).toContain("couponEnabled");
    const signedIn = profile.slice(profile.indexOf("!viewer.userId"));
    expect(signedIn.indexOf("<SignInPrompt />")).toBeLessThan(signedIn.indexOf("<MembershipPanel"));
    expect(signedIn.indexOf("<MembershipPanel")).toBeGreaterThan(-1);

    const paid = paymentNotice({
      kind: "paid",
      email: "member@example.test",
      userId: USER,
      planLookupKey: "emc_monthly",
      invoiceId: "in_test",
      subscriptionId: "sub_test",
      wanderlust: true,
      shieldmate: true,
    });
    expect(paid.subject).toBe("Payment completed");
    const failed = paymentNotice({
      kind: "failed",
      email: "member@example.test",
      userId: USER,
      planLookupKey: "emc_monthly",
      invoiceId: "in_test",
      subscriptionId: "sub_test",
      wanderlust: false,
      shieldmate: false,
    });
    expect(failed.subject).toBe("Payment failed");
    const text = `${paid.subject}\n${failed.subject}\n${paid.fields.map((field) => field.value).join("\n")}`;
    expect(text).not.toMatch(/\breferral\b/i);
    expect(text).not.toMatch(/personal training/i);

    for (const file of ["src/app/page.tsx", "src/app/about/page.tsx", "src/app/sign-in/page.tsx"]) {
      const page = read(file);
      expect(page).not.toContain("Wanderlust");
      expect(page).not.toContain("shieldmate_20x2");
      expect(page).not.toMatch(/\breferral\b/i);
    }
  });

  it("explains a missing Customer Portal configuration", async () => {
    expect(billingQueryNotice("portal-config")).toContain("Customer Portal configuration");
    expect(billingQueryNotice("success")).toContain("Payment received");
    expect(billingQueryNotice("nope")).toBeNull();
    const reason = portalFailureReason(
      new Error(
        "No configuration provided and your test mode default configuration has not been created.",
      ),
    );
    expect(reason).toBe("not-configured");
    const stripe = {
      billingPortal: {
        sessions: {
          create: async () => {
            throw new Error("No configuration provided and your test mode default configuration has not been created.");
          },
        },
      },
    } as unknown as Stripe;
    const portal = await openBillingPortal(stripe, "cus_test", "https://preview.example/profile");
    expect(portal).toEqual({ ok: false, reason: "not-configured" });
  });

  it("formats status for the signed-in panel and strips secrets from logs", () => {
    expect(canStartCheckout(null)).toBe(true);
    expect(canStartCheckout("canceled")).toBe(true);
    expect(canStartCheckout("active")).toBe(false);
    expect(statusLabel("past_due")).toBe("Payment past due");
    expect(formatPeriodEnd("2026-12-01T07:00:00.000Z")).toBe("Dec 1, 2026");
    expect(parseOwnBilling({ customer: null, subscription: null })).toEqual({ customer: null, subscription: null });
    expect(parseOwnBilling({ customer: { stripe_customer_id: "" } })).toBeNull();
    expect(safeBillingMessage(new Error("bad sk_test_abc whsec_def"))).not.toContain("sk_test_abc");
    expect(safeBillingMessage(new Error("bad sk_test_abc whsec_def"))).not.toContain("whsec_def");
    expect(appOrigin(new Request("http://localhost:3000/profile", { headers: { "x-forwarded-host": "preview.example", "x-forwarded-proto": "https" } }))).toBe(
      "https://preview.example",
    );
    expect(appOrigin(new Request("http://localhost:3000/profile", { headers: { "x-forwarded-host": "https://evil.example", "x-forwarded-proto": "https" } }))).toBe(
      "http://localhost:3000",
    );
  });
});

describe("billing migration", () => {
  const sql = read("supabase/migrations/20261121220000_billing.sql");

  it("is staff-select only, idempotent on event id, and has no payout", () => {
    expect(sql).toContain("using (public.is_staff())");
    expect(sql).toContain("create policy billing_runtime_none");
    expect(sql).toContain("using (false)");
    expect(sql).toContain("grant select on public.billing_customers to authenticated");
    expect(sql).toContain("grant select on public.billing_subscriptions to authenticated");
    expect(sql).toContain("grant select on public.billing_events to authenticated");
    expect(sql).not.toMatch(/grant (insert|update|delete|all) on public\.billing_/);
    expect(sql).not.toMatch(/for (insert|update|delete|all)/);
    expect(sql).toContain("event_id text primary key");
    expect(sql).toContain("on conflict (event_id) do nothing");
    expect(sql).toContain("signup_id");
    expect(sql).toContain("gym_share_cents");
    expect(sql).toContain("grant execute on function public.apply_billing_event(text, jsonb) to anon");
    expect(sql).toContain("grant execute on function public.my_billing() to authenticated");
    expect(sql).toContain("set search_path = public");
    expect(sql).not.toContain("transfer_data");
    expect(sql).not.toMatch(/price_1[A-Za-z0-9]/);
    expect(sql).not.toMatch(/sk_(live|test)_/);
    expect(sql).not.toMatch(/whsec_[A-Za-z0-9]/);
  });

  it("keeps price ids and payout fields out of the billing code", () => {
    const files = [
      "src/lib/billing/checkout.ts",
      "src/lib/billing/normalize.ts",
      "src/lib/billing/stripe.ts",
      "src/lib/billing/record.ts",
      "src/lib/billing/webhook.ts",
      "src/app/api/checkout/route.ts",
      "src/app/api/billing-portal/route.ts",
      "src/app/api/stripe-webhook/route.ts",
    ];
    const source = files.map(read).join("\n");
    expect(source).not.toMatch(/(?<![A-Z_])STRIPE_SECRET_KEY/);
    expect(source).toContain("EMC_STRIPE_SECRET_KEY");
    expect(source).toContain("EMC_STRIPE_WEBHOOK_SECRET");
    expect(source).not.toContain("transfer_data");
    expect(source).not.toMatch(/price_1[A-Za-z0-9]/);
    expect(source).not.toMatch(/\breferral\b/i);
    expect(read("src/lib/billing/record.ts")).not.toContain("notice:");
  });
});
