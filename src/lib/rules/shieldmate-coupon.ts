/** Stripe test-mode coupon: $20 off for two months. */
export const SHIELDMATE_COUPON_ID = "shieldmate_20x2";

/**
 * Apply the coupon only for a confirmed Shieldmate pair.
 * Checkout on main does not create a Stripe session. PR #39's session builder
 * applies this coupon whenever its flag is on; that call should use this function.
 */
export function shieldmateCheckoutCoupon(pairConfirmed: boolean): string | null {
  return pairConfirmed ? SHIELDMATE_COUPON_ID : null;
}
