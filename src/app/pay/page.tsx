import { PAYMENT_STEP } from "@/lib/rules/public-copy";
import { Notice, Page } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <Page title="Checkout" lede={PAYMENT_STEP}>
      {params.canceled === "1" ? <Notice>Checkout was canceled. Nothing was charged.</Notice> : null}
      <p>If payment is still open, continue. If you already paid, check your email for the app link.</p>
      {token ? (
        <form action="/api/site-checkout" method="post">
          <input type="hidden" name="token" value={token} />
          <p>A parent or guardian can pay at checkout.</p>
          <button className="primary" type="submit">
            Continue to checkout
          </button>
        </form>
      ) : (
        <p>Use the checkout link you were given. It does not include your email address.</p>
      )}
    </Page>
  );
}
