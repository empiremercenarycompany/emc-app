"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Choice } from "@/components/choice";
import { createGoal } from "@/lib/actions/activity";
import { CMART_CHECKS } from "@/lib/rules/cmart";
import type { ActionResult } from "@/lib/types";

/** Goal, stat, five checks, and a done toggle. It counts only when all five are on. */
export function MentalGoalForm({ required, onSaved }: { required: boolean; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => createGoal(formData),
    null as ActionResult | null,
  );
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;
  useEffect(() => {
    if (state && "ok" in state) savedRef.current();
    if (state && "error" in state) setError(state.error);
  }, [state]);

  return (
    <form
      noValidate
      action={formAction}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        if (!title.trim()) {
          event.preventDefault();
          setError("Write the goal.");
          return;
        }
        setError(null);
      }}
    >
      <label>
        Goal
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Stat
        <select name="category" defaultValue="intelligence">
          <option value="intelligence">Intelligence</option>
          <option value="wisdom">Wisdom</option>
        </select>
      </label>
      {required ? (
        <fieldset>
          <legend>CMART</legend>
          <p>It counts toward Intelligence or Wisdom only when all five are on.</p>
          {CMART_CHECKS.map((check) => (
            <div key={check.id}>
              <Choice name={check.id}>
                {check.letter} · {check.name}
              </Choice>
              <p className="text-mute">{check.prompt}</p>
            </div>
          ))}
        </fieldset>
      ) : (
        <p className="text-mute">The five checks are off for now.</p>
      )}
      <Choice name="marked_done">Done</Choice>
      {error ? <p role="alert">{error}</p> : null}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Saving" : "Save mental goal"}
      </button>
    </form>
  );
}
