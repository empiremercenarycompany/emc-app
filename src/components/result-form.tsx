"use client";

import { useActionState } from "react";
import { ImpactCard } from "@/components/ui";
import type { ActionResult } from "@/lib/types";

export function ResultForm({
  action,
  submit,
  children,
  secondary,
  primary,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  submit: string;
  children: React.ReactNode;
  secondary?: boolean;
  primary?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {children}
      <button className={secondary ? "secondary" : primary ? "primary" : undefined} disabled={pending} type="submit">
        {pending ? "Saving" : submit}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
      {state && "ok" in state ? <p>Saved.</p> : null}
      {state && "impact" in state ? <ImpactCard impact={state.impact} /> : null}
    </form>
  );
}
