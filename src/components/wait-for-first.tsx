"use client";

import { useActionState } from "react";
import { waitForFirstChoice } from "@/lib/actions/seat";
import { WAIT_FOR_FIRST } from "@/lib/rules/seat-choice";
import type { ActionResult } from "@/lib/types";

export function WaitForFirst() {
  const [state, action, pending] = useActionState(
    async (previous: ActionResult | null) => {
      void previous;
      return waitForFirstChoice();
    },
    null,
  );
  return (
    <form action={action}>
      <button className="secondary" type="submit" disabled={pending}>
        {pending ? "Saving" : WAIT_FOR_FIRST}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
