import { headers } from "next/headers";
import { DevLogin } from "@/components/dev-login";
import { ThemeToggle } from "@/components/theme-toggle";
import { Page } from "@/components/ui";
import { SignInForm } from "@/components/sign-in-form";
import { devLoginAllowed } from "@/lib/dev-login";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const host = (await headers()).get("host");
  const devLogin = devLoginAllowed(process.env.NEXT_PUBLIC_DEV_LOGIN, host);
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
      <SignInForm />
      {devLogin ? <DevLogin /> : null}
    </Page>
  );
}
