import { describe, expect, it } from "vitest";
import { EMC_GYM_MONTHLY, EMC_MONTHLY } from "@/lib/billing/plans";
import {
  buildSiteMetadata,
  isTeenWaitlist,
  siteCheckoutSessionParams,
  sitePlanFor,
  SITE_CHECKOUT_METADATA_KEYS,
} from "@/lib/billing/site-checkout";

describe("site checkout contract", () => {
  it("uses $60 for a current member with a blank number and $120 otherwise", () => {
    expect(sitePlanFor("current", null)).toBe("member");
    expect(sitePlanFor("current", "")).toBe("member");
    expect(sitePlanFor("former", null)).toBe("standard");
    expect(sitePlanFor("not_yet", "emc_gym_monthly")).toBe("standard");
    expect(sitePlanFor("former", "emc_monthly")).toBe("member");
  });

  it("blocks the teen waitlist and allows 16–17", () => {
    expect(isTeenWaitlist({ ageGroup: "under_16" })).toBe(true);
    expect(isTeenWaitlist({ teenWaitlist: true })).toBe(true);
    expect(isTeenWaitlist({ teenWaitlist: "true" })).toBe(true);
    expect(isTeenWaitlist({ ageGroup: "age_16_17" })).toBe(false);
    expect(isTeenWaitlist({ ageGroup: "adult" })).toBe(false);
  });

  it("puts the contract metadata on the session and the subscription, with no coupon and no signup id", () => {
    const metadata = buildSiteMetadata({
      email: "Member@example.test",
      gymMember: "current",
      membershipNumber: "",
      ageGroup: "age_16_17",
      preferredSlot: "morning",
      signupSrc: "fb-gamegrid",
      writNumber: "GG-12",
      heardFrom: "Game Grid writ",
      joiningWithFriend: "no",
      friendName: "",
      invitedBy: "",
      waitlistFor: "",
    });
    expect(metadata.signup_email).toBe("member@example.test");
    expect(metadata.plan).toBe(EMC_MONTHLY);
    expect(metadata.surface).toBe("site");
    expect(Object.keys(metadata).sort()).toEqual([...SITE_CHECKOUT_METADATA_KEYS].sort());
    expect(metadata).not.toHaveProperty("signup_id");
    const params = siteCheckoutSessionParams({
      metadata,
      priceId: "price_member",
      origin: "https://emc.example",
      resumeToken: "opaque-token",
    });
    expect(params.mode).toBe("subscription");
    expect(params.customer_email).toBe("member@example.test");
    expect(params.metadata).toBe(params.subscription_data.metadata);
    expect(params).not.toHaveProperty("discounts");
    expect(JSON.stringify(params)).not.toContain("shieldmate");
    expect(JSON.stringify(params)).not.toContain("signup_id");
    expect(params.cancel_url).toContain("/pay?token=opaque-token");
    expect(params.cancel_url).not.toContain("example.test");
    expect(params.success_url).not.toContain("example.test");
    const standard = buildSiteMetadata({ email: "guest@example.test", gymMember: "not_yet" });
    expect(standard.plan).toBe(EMC_GYM_MONTHLY);
  });
});
