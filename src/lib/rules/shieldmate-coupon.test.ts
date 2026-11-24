import { describe, expect, it } from "vitest";
import { SHIELDMATE_COUPON_ID, shieldmateCheckoutCoupon } from "./shieldmate-coupon";

describe("shieldmate coupon", () => {
  it("applies shieldmate_20x2 only for a confirmed pair", () => {
    expect(SHIELDMATE_COUPON_ID).toBe("shieldmate_20x2");
    expect(shieldmateCheckoutCoupon(true)).toBe("shieldmate_20x2");
    expect(shieldmateCheckoutCoupon(false)).toBeNull();
  });
});
