import { headers } from "next/headers";
import { DevLogin } from "@/components/dev-login";
import { ThemeToggle } from "@/components/theme-toggle";
import { Page } from "@/components/ui";
import { SignInForm } from "@/components/sign-in-form";
import { safeNextPath } from "@/lib/auth-next";
import { devLoginAllowed } from "@/lib/dev-login";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const host = (await headers()).get("host");
  const devLogin = devLoginAllowed(process.env.NEXT_PUBLIC_DEV_LOGIN, host);
  const nextPath = safeNextPath(params.next);
  return (
    <Page
      badge
      title="Join the Company"
      lede="A magic link is the only door. No password is stored here."
      leading={<ThemeToggle />}
    >
      {params.error ? (
        <p role="alert">That link has to be opened in the same browser that asked for it. Request another below.</p>
      ) : null}
      <SignInForm nextPath={nextPath} />
      {devLogin ? <DevLogin /> : null}
    </Page>
  );
}
