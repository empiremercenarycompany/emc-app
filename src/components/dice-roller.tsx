"use client";

import { useState } from "react";
import { saveDice } from "@/lib/actions/activity";
import { rollDice, type DiceRoll } from "@/lib/rules/dice";

export function DiceRoller({
  checks,
  canSave,
}: {
  checks: { label: string; expression: string }[];
  canSave: boolean;
}) {
  const [expression, setExpression] = useState("1d20");
  const [advantage, setAdvantage] = useState(false);
  const [disadvantage, setDisadvantage] = useState(false);
  const [roll, setRoll] = useState<DiceRoll | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function rollNow(next = expression) {
    setSaved(null);
    try {
      setRoll(rollDice(next, { advantage, disadvantage }));
      setError(null);
      setExpression(next);
    } catch (caught) {
      setRoll(null);
      setError(caught instanceof Error ? caught.message : "That roll did not work.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Expression
        <input
          aria-label="Dice expression"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
        />
      </label>
      <label className="flex items-center gap-2">
        <input className="w-auto" type="checkbox" checked={advantage} onChange={(event) => setAdvantage(event.target.checked)} />
        Advantage
      </label>
      <label className="flex items-center gap-2">
        <input
          className="w-auto"
          type="checkbox"
          checked={disadvantage}
          onChange={(event) => setDisadvantage(event.target.checked)}
        />
        Disadvantage
      </label>
      <button className="primary" type="button" onClick={() => rollNow()}>
        Roll
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {roll ? (
        <div className="border border-steel p-3" data-testid="dice-result">
          <p className="display text-5xl">{roll.total}</p>
          <p className="text-mute">
            {roll.mode} · kept {roll.kept.join(", ")}
            {roll.modifier ? ` ${roll.modifier > 0 ? "+" : ""}${roll.modifier}` : ""}
          </p>
          {roll.otherRolls ? <p className="text-mute">Other pool {roll.otherRolls.join(", ")}</p> : null}
          {canSave ? (
            <form
              className="mt-3"
              action={async (formData) => {
                const result = await saveDice(formData);
                setSaved("error" in result ? result.error : "Roll saved on your sheet.");
              }}
            >
              <input type="hidden" name="expression" value={roll.expression} />
              <input type="hidden" name="result" value={roll.total} />
              <input type="hidden" name="rolls" value={roll.kept.join(",")} />
              <input type="hidden" name="mode" value={roll.mode} />
              <button className="secondary" type="submit">
                Save roll
              </button>
            </form>
          ) : null}
          {saved ? <p className="mt-2">{saved}</p> : null}
        </div>
      ) : null}
      {checks.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2>Sheet checks</h2>
          {checks.map((check) => (
            <button key={check.label} className="secondary" type="button" onClick={() => rollNow(check.expression)}>
              {check.label} · {check.expression}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
