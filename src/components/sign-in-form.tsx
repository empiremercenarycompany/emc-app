"use client";

import { useEffect, useRef, useState } from "react";
import { signInError } from "@/lib/rules/auth-error";
import { createBrowser } from "@/lib/supabase/browser";
import { MISSING_ENV } from "@/lib/supabase/env";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const canResend = sentAt != null && now - sentAt >= 30_000;

  useEffect(() => {
    if (!sent) return;
    statusRef.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sent]);

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
      setSentAt(null);
      setMessage(signInError(error.message));
      return;
    }
    setSent(true);
    setSentAt(Date.now());
    setNow(Date.now());
    setMessage(null);
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
      <p className="text-sm text-mute">Signed up on empiremercenarycompany.com? Use the same email.</p>
      <p className="text-sm text-mute">
        New here? Start at{" "}
        <a href="https://empiremercenarycompany.com">empiremercenarycompany.com</a>.
      </p>
      {message ? <p role="alert">{message}</p> : null}
      {sent ? (
        <>
          <p ref={statusRef} tabIndex={-1} role="status">
            Check your email. The link is for {email}.
          </p>
          <p>Check spam if it is not in your inbox.</p>
          <p>{"Open the link in the same browser you're using now."}</p>
          <button type="submit" disabled={pending || !canResend}>
            {canResend ? "Send the link again" : "Send the link again in a moment"}
          </button>
        </>
      ) : null}
    </form>
  );
}
