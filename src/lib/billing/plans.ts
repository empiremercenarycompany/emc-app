import {
  PLAN_LABEL_MEMBER,
  PLAN_LABEL_STANDARD,
  PRODUCT_NAME_MEMBER,
  PRODUCT_NAME_STANDARD,
} from "@/lib/rules/public-copy";

export const EMC_MONTHLY = "emc_monthly";
export const EMC_GYM_MONTHLY = "emc_gym_monthly";
export const WANDERLUST_ADDON = "wanderlust_addon_monthly";
export const SHIELDMATE_COUPON_ID = "shieldmate_20x2";

export const BASE_PLANS = [EMC_GYM_MONTHLY, EMC_MONTHLY] as const;
export type BasePlan = (typeof BASE_PLANS)[number];

/** $120 is listed first. $60 is the current-member price. */
export const PLAN_CHOICES: {
  lookupKey: BasePlan;
  title: string;
  productName: string;
  price: string;
}[] = [
  {
    lookupKey: EMC_GYM_MONTHLY,
    title: PLAN_LABEL_STANDARD,
    productName: PRODUCT_NAME_STANDARD,
    price: "$120/month",
  },
  {
    lookupKey: EMC_MONTHLY,
    title: PLAN_LABEL_MEMBER,
    productName: PRODUCT_NAME_MEMBER,
    price: "$60/month",
  },
];

export function isBasePlan(value: string): value is BasePlan {
  return value === EMC_MONTHLY || value === EMC_GYM_MONTHLY;
}

export function planTitle(lookupKey: string): string {
  return PLAN_CHOICES.find((plan) => plan.lookupKey === lookupKey)?.title ?? lookupKey;
}

export function productName(lookupKey: string): string {
  return PLAN_CHOICES.find((plan) => plan.lookupKey === lookupKey)?.productName ?? lookupKey;
}
