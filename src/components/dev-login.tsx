"use client";

import { useState } from "react";
import { devLoginAllowed, devRosterAccounts } from "@/lib/dev-login";

export function DevLogin() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const flagOn = process.env.NEXT_PUBLIC_DEV_LOGIN === "1";
  const local =
    typeof window === "undefined" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!flagOn || !local || !devLoginAllowed("1", typeof window === "undefined" ? "localhost" : window.location.host)) {
    return null;
  }

  async function choose(email: string, label: string) {
    setPending(label);
    setMessage(null);
    const response = await fetch("/api/dev-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setPending(null);
    if (response.status === 404) {
      setMessage("Dev login is off.");
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Dev login did not open a session. No mail was sent.");
      return;
    }
    window.location.assign("/character");
  }

  return (
    <section className="border border-steel p-4">
      <h2>Dev login</h2>
      <p className="text-mute">Localhost only. Pick a test account. No mail is sent.</p>
      <p>Pick a test account</p>
      <div className="flex flex-col gap-2">
        {devRosterAccounts().map((account) => (
          <button
            key={account.email}
            className="secondary"
            type="button"
            disabled={pending !== null}
            onClick={() => choose(account.email, account.label)}
          >
            {pending === account.label ? "Opening" : account.label}
          </button>
        ))}
      </div>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
