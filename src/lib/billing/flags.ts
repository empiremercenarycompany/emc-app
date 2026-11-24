/** Only the exact strings the Preview env uses. "TRUE", "yes", and empty stay off. */
export function billingFlagEnabled(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export function billingFlags(env: NodeJS.ProcessEnv = process.env): {
  wanderlust: boolean;
  coupon: boolean;
} {
  return {
    wanderlust: billingFlagEnabled(env.BILLING_WANDERLUST_ENABLED),
    coupon: billingFlagEnabled(env.BILLING_SHIELDMATE_COUPON_ENABLED),
  };
}
