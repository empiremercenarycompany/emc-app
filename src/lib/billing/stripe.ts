import Stripe from "stripe";

export function stripeSecretKey(): string | null {
  const value = process.env.EMC_STRIPE_SECRET_KEY?.trim();
  return value ? value : null;
}

export function stripeWebhookSecret(): string | null {
  const value = process.env.EMC_STRIPE_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

export function getStripe(): Stripe | null {
  const key = stripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}

/** Drop key-shaped substrings before anything is written to logs. */
export function safeBillingMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "billing error";
  return message
    .replace(/sk_(?:live|test)_[A-Za-z0-9]+/g, "[secret]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[secret]")
    .replace(/rk_(?:live|test)_[A-Za-z0-9]+/g, "[secret]")
    .slice(0, 300);
}

export function isMissingResource(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "resource_missing";
}

export function portalFailureReason(error: unknown): "not-configured" | "unavailable" {
  const message = error instanceof Error ? error.message : "";
  if (/no configuration provided/i.test(message)) return "not-configured";
  if (/customer portal/i.test(message) && /configuration/i.test(message)) return "not-configured";
  return "unavailable";
}

export function isStripeCheckoutUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://checkout.stripe.com/");
}

export function isStripePortalUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://billing.stripe.com/");
}
