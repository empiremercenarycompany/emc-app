import { defaultWebhookDeps, handleStripeWebhook } from "@/lib/billing/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleStripeWebhook(request, defaultWebhookDeps());
}
