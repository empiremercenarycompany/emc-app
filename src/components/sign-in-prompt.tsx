import Link from "next/link";

/** Logged-out call to action. One primary button, not a line of body text. */
export function SignInPrompt() {
  return (
    <Link className="button primary sign-in-prompt" href="/sign-in">
      Sign in to continue
    </Link>
  );
}
