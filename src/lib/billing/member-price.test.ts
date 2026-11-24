import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMembershipCheckout } from "@/lib/billing/checkout";
import {
  MEMBER_PRICE_CENTS,
  STANDARD_PRICE_CENTS,
  checkoutPlanFor,
  monthlyChargeCents,
  staffPlanError,
} from "@/lib/billing/price";
import { SHIELDMATE_COUPON_ID } from "@/lib/rules/shieldmate-coupon";
import { parseGymMember } from "@/lib/rules/public-copy";

const USER = "11111111-1111-4111-8111-111111111111";

function stripeWithPrices(): Stripe {
  return {
    prices: {
      list: async ({ lookup_keys }: { lookup_keys: string[] }) => ({
        data: lookup_keys.map((key) => ({ id: `price_for_${key}`, lookup_key: key, active: true })),
      }),
    },
  } as unknown as Stripe;
}

describe("member and standard prices", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps current to $60 only after staff switch, and former or not-yet to $120", () => {
    const number = "ESF-1001";
    expect(parseGymMember("not-yet")).toBe("not_yet");
    expect(
      checkoutPlanFor({ gymMember: "current", membershipVerified: true, membershipNumber: number, staffPlan: "member" }),
    ).toBe("member");
    expect(
      checkoutPlanFor({ gymMember: "current", membershipVerified: true, membershipNumber: number, staffPlan: null }),
    ).toBe("standard");
    expect(
      checkoutPlanFor({ gymMember: "current", membershipVerified: false, membershipNumber: number, staffPlan: "member" }),
    ).toBe("standard");
    expect(
      checkoutPlanFor({ gymMember: "current", membershipVerified: true, membershipNumber: null, staffPlan: "member" }),
    ).toBe("standard");
    expect(
      checkoutPlanFor({ gymMember: "former", membershipVerified: true, membershipNumber: number, staffPlan: "member" }),
    ).toBe("standard");
    expect(
      checkoutPlanFor({
        gymMember: parseGymMember("not-yet"),
        membershipVerified: true,
        membershipNumber: null,
        staffPlan: "member",
      }),
    ).toBe("standard");
    expect(
      checkoutPlanFor({ gymMember: null, membershipVerified: false, membershipNumber: null, staffPlan: null }),
    ).toBe("standard");
    expect(
      staffPlanError({ gymMember: "current", membershipVerified: false, membershipNumber: number, staffPlan: "member" }),
    ).toMatch(/Verify membership before sending the \$60 link/);
    expect(
      staffPlanError({ gymMember: "current", membershipVerified: true, membershipNumber: "  ", staffPlan: "member" }),
    ).toMatch(/membership number is required/i);
    expect(
      staffPlanError({ gymMember: "current", membershipVerified: true, membershipNumber: number, staffPlan: "member" }),
    ).toBeNull();
    expect(
      staffPlanError({ gymMember: "former", membershipVerified: true, membershipNumber: number, staffPlan: "standard" }),
    ).toBeNull();
  });

  it("moves a lapsed member back to $120", () => {
    expect(
      checkoutPlanFor({
        gymMember: "current",
        membershipVerified: false,
        membershipNumber: "ESF-1001",
        staffPlan: "standard",
      }),
    ).toBe("standard");
  });

  it("charges a member pair $40 each for 2 months, then $60", () => {
    expect(monthlyChargeCents("member", 1, true)).toBe(4000);
    expect(monthlyChargeCents("member", 2, true)).toBe(4000);
    expect(monthlyChargeCents("member", 3, true)).toBe(MEMBER_PRICE_CENTS);
    expect(monthlyChargeCents("member", 3, true)).toBe(6000);
  });

  it("charges a non-member pair $100 each for 2 months, then $120", () => {
    expect(monthlyChargeCents("standard", 1, true)).toBe(10000);
    expect(monthlyChargeCents("standard", 2, true)).toBe(10000);
    expect(monthlyChargeCents("standard", 3, true)).toBe(STANDARD_PRICE_CENTS);
    expect(monthlyChargeCents("standard", 3, true)).toBe(12000);
    expect(monthlyChargeCents("standard", 1, false)).toBe(12000);
  });

  it("gives a mixed pair each person's own price minus $20", () => {
    expect(monthlyChargeCents("member", 1, true)).toBe(4000);
    expect(monthlyChargeCents("standard", 1, true)).toBe(10000);
    expect(monthlyChargeCents("member", 3, true)).toBe(6000);
    expect(monthlyChargeCents("standard", 3, true)).toBe(12000);
  });

  it("attaches shieldmate_20x2 to both prices for a confirmed pair", async () => {
    const stripe = stripeWithPrices();
    const member = await buildMembershipCheckout(stripe, {
      plan: "member",
      wanderlustRequested: false,
      wanderlustEnabled: false,
      couponEnabled: true,
      pairConfirmed: true,
      userId: USER,
      email: "member@example.test",
      customerId: null,
      origin: "https://preview.example",
    });
    const standard = await buildMembershipCheckout(stripe, {
      plan: "standard",
      wanderlustRequested: false,
      wanderlustEnabled: false,
      couponEnabled: true,
      pairConfirmed: true,
      userId: USER,
      email: "player@example.test",
      customerId: null,
      origin: "https://preview.example",
    });
    expect(member?.line_items).toEqual([{ price: "price_for_emc_monthly", quantity: 1 }]);
    expect(standard?.line_items).toEqual([{ price: "price_for_emc_gym_monthly", quantity: 1 }]);
    expect(member?.discounts).toEqual([{ coupon: SHIELDMATE_COUPON_ID }]);
    expect(standard?.discounts).toEqual([{ coupon: SHIELDMATE_COUPON_ID }]);
    expect(member?.line_items?.[0]?.price).not.toBe(standard?.line_items?.[0]?.price);
  });

  it("uses an env override and does not look up that plan", async () => {
    vi.stubEnv("EMC_STRIPE_PRICE_STANDARD", "price_standard_override");
    const stripe = stripeWithPrices();
    const params = await buildMembershipCheckout(stripe, {
      plan: "standard",
      wanderlustRequested: false,
      wanderlustEnabled: false,
      couponEnabled: false,
      pairConfirmed: false,
      userId: USER,
      email: null,
      customerId: null,
      origin: "https://preview.example",
    });
    expect(params?.line_items).toEqual([{ price: "price_standard_override", quantity: 1 }]);
  });

  it("fails closed when the $120 price cannot be resolved and does not charge $60", async () => {
    vi.stubEnv("EMC_STRIPE_PRICE_MEMBER", "price_member_test");
    const seen: string[][] = [];
    const stripe = {
      prices: {
        list: async ({ lookup_keys }: { lookup_keys: string[] }) => {
          seen.push(lookup_keys);
          return { data: [] };
        },
      },
    } as unknown as Stripe;
    await expect(
      buildMembershipCheckout(stripe, {
        plan: "standard",
        wanderlustRequested: true,
        wanderlustEnabled: true,
        couponEnabled: true,
        pairConfirmed: true,
        userId: USER,
        email: null,
        customerId: null,
        origin: "https://preview.example",
      }),
    ).rejects.toThrow(/The \$120 price could not be resolved\. The \$60 price was not charged\./);
    expect(seen).toEqual([["emc_gym_monthly"]]);
    expect(JSON.stringify(seen)).not.toContain("emc_monthly");
  });
});
