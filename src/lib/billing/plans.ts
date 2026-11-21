export const EMC_MONTHLY = "emc_monthly";
export const EMC_GYM_MONTHLY = "emc_gym_monthly";
export const WANDERLUST_ADDON = "wanderlust_addon_monthly";
export const SHIELDMATE_COUPON_ID = "shieldmate_20x2";

export const BASE_PLANS = [EMC_MONTHLY, EMC_GYM_MONTHLY] as const;
export type BasePlan = (typeof BASE_PLANS)[number];

export const PLAN_CHOICES: { lookupKey: BasePlan; title: string; price: string; detail: string }[] = [
  {
    lookupKey: EMC_MONTHLY,
    title: "EMC Membership",
    price: "$60 a month",
    detail: "Company membership.",
  },
  {
    lookupKey: EMC_GYM_MONTHLY,
    title: "EMC + Empire Strength and Fitness",
    price: "$120 a month",
    detail: "Company membership and a membership at Empire Strength and Fitness.",
  },
];

export function isBasePlan(value: string): value is BasePlan {
  return value === EMC_MONTHLY || value === EMC_GYM_MONTHLY;
}

export function planTitle(lookupKey: string): string {
  return PLAN_CHOICES.find((plan) => plan.lookupKey === lookupKey)?.title ?? lookupKey;
}
