"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/types";

export function GroupGoalForm({
  squads,
  action,
  submit = "Post group goal",
}: {
  squads: { id: string; name: string }[];
  action: (formData: FormData) => Promise<ActionResult>;
  submit?: string;
}) {
  const [title, setTitle] = useState("");
  const [squadId, setSquadId] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );
  const savedSquad = state && "ok" in state ? squads.find((squad) => squad.id === state.saved?.squadId)?.name : null;

  return (
    <form action={formAction} className="flex flex-col gap-3" autoComplete="off">
      <label>
        Squad
        <select name="goal_squad_id" value={squadId} onChange={(event) => setSquadId(event.target.value)}>
          <option value="">Whole company</option>
          {squads.map((squad) => (
            <option key={squad.id} value={squad.id}>
              {squad.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input name="goal_title" value={title} onChange={(event) => setTitle(event.target.value)} required autoComplete="off" />
      </label>
      <label>
        Description
        <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Objective
        <input name="objective_title" value={objective} onChange={(event) => setObjective(event.target.value)} autoComplete="off" />
      </label>
      <label>
        Target
        <input name="objective_target" value={target} onChange={(event) => setTarget(event.target.value)} inputMode="numeric" autoComplete="off" />
      </label>
      <label>
        Unit
        <input name="objective_unit" value={unit} onChange={(event) => setUnit(event.target.value)} autoComplete="off" />
      </label>
      <button disabled={pending || title.trim().length === 0} type="submit" aria-busy={pending}>
        {pending ? "Saving" : submit}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
      {state && "ok" in state && state.saved ? (
        <p data-testid="goal-saved" data-squad-id={state.saved.squadId ?? ""}>
          Saved {state.saved.title}
          {savedSquad ? ` · ${savedSquad}` : state.saved.squadId ? "" : " · Whole company"}
        </p>
      ) : null}
    </form>
  );
}
