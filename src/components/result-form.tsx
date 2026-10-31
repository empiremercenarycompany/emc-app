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
  showSubmit = true,
  allowSubmit = true,
  submitDisabled = false,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  submit: string;
  children: React.ReactNode;
  secondary?: boolean;
  primary?: boolean;
  showSubmit?: boolean;
  allowSubmit?: boolean;
  submitDisabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        if (!allowSubmit) event.preventDefault();
      }}
    >
      {children}
      {showSubmit ? (
        <button
          className={secondary ? "secondary" : primary ? "primary" : undefined}
          disabled={pending || submitDisabled}
          type="submit"
          aria-busy={pending}
        >
          {pending ? "Saving" : submit}
        </button>
      ) : null}
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
      {state && "ok" in state ? <p>Saved.</p> : null}
      {state && "impact" in state ? <ImpactCard impact={state.impact} /> : null}
    </form>
  );
}
