import { Page } from "@/components/ui";
import { SignInForm } from "@/components/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Page badge title="Join the Company" lede="A magic link is the only door. No password is stored here.">
      {params.error ? <p role="alert">That link did not sign you in. Request another.</p> : null}
      <SignInForm />
    </Page>
  );
}
