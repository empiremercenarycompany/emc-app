"use client";

import { Choice } from "@/components/choice";
import { ResultForm } from "@/components/result-form";
import { createGoal } from "@/lib/actions/activity";
import { CMART_CHECKS } from "@/lib/rules/cmart";

export function MentalGoalForm({ required }: { required: boolean }) {
  return (
    <ResultForm action={createGoal} submit="Save mental goal" primary>
      <label>
        Goal
        <input name="title" required />
      </label>
      <label>
        Stat
        <select name="category" defaultValue="intelligence">
          <option value="intelligence">Intelligence</option>
          <option value="wisdom">Wisdom</option>
        </select>
      </label>
      <label>
        What done looks like
        <textarea name="description" />
      </label>
      <label>
        Due
        <input type="date" name="period_end" />
      </label>
      {required ? (
        <fieldset>
          <legend>CMART</legend>
          <p>An order without a deadline is a wish.</p>
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
    </ResultForm>
  );
}
