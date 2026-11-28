import Link from "next/link";

/** Logged-out call to action. One primary button, not a line of body text. */
export function SignInPrompt({ label = "Sign in to continue", next }: { label?: string; next?: string }) {
  const href = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
  return (
    <Link className="button primary sign-in-prompt" href={href}>
      {label}
    </Link>
  );
}
