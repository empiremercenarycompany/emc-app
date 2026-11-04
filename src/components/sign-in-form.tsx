"use client";

import { useState } from "react";
import { signInError } from "@/lib/rules/auth-error";
import { createBrowser } from "@/lib/supabase/browser";
import { MISSING_ENV } from "@/lib/supabase/env";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createBrowser();
    if (!supabase) {
      setMessage(MISSING_ENV);
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPending(false);
    if (error) {
      setSent(false);
      setMessage(signInError(error.message));
      return;
    }
    setSent(true);
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {configured ? null : <p role="alert">{MISSING_ENV}</p>}
      <label className="flex flex-col gap-1">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <button className="primary" disabled={pending || !configured} type="submit">
        {pending ? "Opening the gates..." : "Send my sign-in link"}
      </button>
      <p className="text-sm text-mute">Already with the Company? The same link brings you back.</p>
      <button type="button" disabled>
        Discord
      </button>
      <button type="button" disabled>
        Google
      </button>
      <p className="text-sm text-mute">Discord and Google stay off until the Company configures them.</p>
      {message ? <p role={sent ? "status" : "alert"}>{message}</p> : null}
      {sent ? <p>{"Open the link in the same browser you're using now."}</p> : null}
    </form>
  );
}
