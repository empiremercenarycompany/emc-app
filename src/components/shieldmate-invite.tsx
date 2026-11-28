"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui";
import { acceptShieldmateInvite, createShieldmateInvite } from "@/lib/actions/shieldmate";
import { shieldmateCountdown, shieldmateDaysLeft } from "@/lib/rules/shieldmate-copy";
import type { ActionResult } from "@/lib/types";

export function ShieldmateInvite({
  code,
  expiresAt,
  status,
}: {
  code: string | null;
  expiresAt: string | null;
  status: string | null;
}) {
  const [created, createAction, creating] = useActionState(
    async (previous: ActionResult | null) => {
      void previous;
      return createShieldmateInvite();
    },
    null,
  );
  const [accepted, acceptAction, accepting] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => acceptShieldmateInvite(formData),
    null,
  );
  const days = expiresAt ? shieldmateDaysLeft(expiresAt) : 0;
  const link = code ? `/shieldmate?code=${code}` : "";

  return (
    <Panel title="Shieldmate">
      {code && expiresAt && status ? <p>{shieldmateCountdown(days, status)}</p> : <p>Share an invite code. Your friend has 14 days to join.</p>}
      {code ? (
        <>
          <p>Invite code {code}</p>
          <p>{link}</p>
        </>
      ) : (
        <form action={createAction}>
          <button type="submit" disabled={creating}>
            {creating ? "Saving" : "Create a Shieldmate invite"}
          </button>
        </form>
      )}
      <form action={acceptAction} className="flex flex-col gap-2">
        <label>
          Shieldmate code
          <input name="code" maxLength={12} autoComplete="off" />
        </label>
        <button type="submit" disabled={accepting}>
          {accepting ? "Saving" : "Join with this code"}
        </button>
      </form>
      {created && "error" in created ? <p role="alert">{created.error}</p> : null}
      {accepted && "error" in accepted ? <p role="alert">{accepted.error}</p> : null}
      {accepted && "ok" in accepted ? <p>Shieldmate joined.</p> : null}
    </Panel>
  );
}
