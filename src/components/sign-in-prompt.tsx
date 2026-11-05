import Link from "next/link";

/** Logged-out call to action. One primary button, not a line of body text. */
export function SignInPrompt({ label = "Sign in to continue" }: { label?: string }) {
  return (
    <Link className="button primary sign-in-prompt" href="/sign-in">
      {label}
    </Link>
  );
}
