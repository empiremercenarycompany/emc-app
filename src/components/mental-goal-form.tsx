"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Choice } from "@/components/choice";
import { createGoal, updateGoal } from "@/lib/actions/activity";
import { CMART_CHECKS } from "@/lib/rules/cmart";
import { duplicateGoalTitle } from "@/lib/rules/goal-title";
import type { ActionResult } from "@/lib/types";

/** Goal, stat, five checks, and a done toggle. A new goal is saved only when all five are on. */
export function MentalGoalForm({
  required,
  onSaved,
  goalId,
  initialTitle = "",
  initialCategory = "intelligence",
  initialOn = [],
  initialDone = false,
  existing = [],
}: {
  required: boolean;
  onSaved: () => void;
  goalId?: string;
  initialTitle?: string;
  initialCategory?: string;
  initialOn?: string[];
  initialDone?: boolean;
  existing?: { id?: string; category: string; title: string }[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => (goalId ? updateGoal(formData) : createGoal(formData)),
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
        const data = new FormData(event.currentTarget);
        if (!title.trim()) {
          event.preventDefault();
          setError("Write the goal.");
          return;
        }
        const category = String(data.get("category") ?? "");
        if (duplicateGoalTitle(existing, category, title, goalId)) {
          event.preventDefault();
          setError("You already have that goal for this stat.");
          return;
        }
        const checked = CMART_CHECKS.filter((check) => data.get(check.id) === "on").length;
        if (required && !goalId && checked < CMART_CHECKS.length) {
          event.preventDefault();
          setError("All five checks have to be on before this goal is saved.");
          return;
        }
        setError(null);
      }}
    >
      {goalId ? <input type="hidden" name="goal_id" value={goalId} /> : null}
      <label>
        Goal
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Stat
        <select name="category" defaultValue={initialCategory}>
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
              <Choice name={check.id} defaultChecked={initialOn.includes(check.letter)}>
                {check.letter} · {check.name}
              </Choice>
              <p className="text-mute">{check.prompt}</p>
            </div>
          ))}
        </fieldset>
      ) : (
        <p className="text-mute">The five checks are off for now.</p>
      )}
      <Choice name="marked_done" defaultChecked={initialDone}>
        Done
      </Choice>
      {error ? <p role="alert">{error}</p> : null}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Saving" : goalId ? "Save changes" : "Save mental goal"}
      </button>
    </form>
  );
}
