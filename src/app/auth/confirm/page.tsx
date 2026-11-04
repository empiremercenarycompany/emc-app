import Link from "next/link";
import { confirmSignIn } from "@/lib/actions/confirm-sign-in";
import { confirmOtpType, safeNextPath } from "@/lib/auth-next";
import { Page } from "@/components/ui";

export default async function ConfirmSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? "";
  const type = confirmOtpType(params.type);
  const next = safeNextPath(params.next);
  const ready = Boolean(tokenHash && type && !params.error);

  return (
    <Page badge title="Continue" lede="One step finishes the sign-in. The link is not used until you press the button.">
      {ready ? (
        <form action={confirmSignIn} className="flex flex-col gap-3">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type ?? ""} />
          <input type="hidden" name="next" value={next} />
          <button className="primary" type="submit">
            Continue
          </button>
        </form>
      ) : (
        <>
          <p role="alert">That link did not sign you in. Request another.</p>
          <Link className="button primary" href="/sign-in">
            Request a new link
          </Link>
        </>
      )}
    </Page>
  );
}
