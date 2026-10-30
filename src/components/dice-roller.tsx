"use client";

import { useMemo, useState } from "react";
import { saveDice } from "@/lib/actions/activity";
import { parseDice, rollDice, type DiceRoll } from "@/lib/rules/dice";

const FACES = [4, 6, 8, 10, 12, 20, 100] as const;

export function DiceRoller({
  checks = [],
  canSave = false,
  initialExpression = "1d20",
}: {
  checks?: { label: string; expression: string }[];
  canSave?: boolean;
  initialExpression?: string;
}) {
  const start = useMemo(() => parseDice(initialExpression), [initialExpression]);
  const [die, setDie] = useState(start?.sides ?? 20);
  const [modifier, setModifier] = useState(start?.modifier ?? 0);
  const [expression, setExpression] = useState(initialExpression);
  const [advantage, setAdvantage] = useState(false);
  const [disadvantage, setDisadvantage] = useState(false);
  const [roll, setRoll] = useState<DiceRoll | null>(null);
  const [history, setHistory] = useState<DiceRoll[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [spin, setSpin] = useState(0);

  function applyDie(nextDie: number, nextMod = modifier) {
    const shaped = nextMod === 0 ? `1d${nextDie}` : nextMod > 0 ? `1d${nextDie}+${nextMod}` : `1d${nextDie}${nextMod}`;
    setDie(nextDie);
    setExpression(shaped);
    return shaped;
  }

  function rollNow(next = expression) {
    setSaved(null);
    const parsed = parseDice(next);
    const d20 = parsed?.sides === 20;
    try {
      const result = rollDice(next, {
        advantage: Boolean(d20 && advantage && !disadvantage),
        disadvantage: Boolean(d20 && disadvantage && !advantage),
      });
      setRoll(result);
      setHistory((items) => [result, ...items].slice(0, 12));
      setSpin((value) => value + 1);
      setError(null);
      setExpression(next);
    } catch (caught) {
      setRoll(null);
      setError(caught instanceof Error ? caught.message : "That roll did not work.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Dice">
        {FACES.map((face) => (
          <button
            key={face}
            className="secondary"
            aria-pressed={die === face}
            type="button"
            onClick={() => applyDie(face)}
          >
            d{face}
          </button>
        ))}
      </div>
      <label>
        Expression
        <input aria-label="Dice expression" value={expression} onChange={(event) => setExpression(event.target.value)} />
      </label>
      <label>
        Modifier
        <input
          aria-label="Modifier"
          inputMode="numeric"
          value={modifier}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) return;
            setModifier(next);
            applyDie(die, next);
          }}
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
          <p key={spin} className="dice-tumble display text-5xl">
            {roll.total}
          </p>
          <p className="text-mute">
            {roll.mode} · kept {roll.kept.join(", ")}
            {roll.modifier ? ` ${roll.modifier > 0 ? "+" : ""}${roll.modifier}` : ""}
          </p>
          {roll.otherRolls ? <p className="text-mute">Other roll {roll.otherRolls.join(", ")}</p> : null}
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
      {history.length > 1 ? (
        <div>
          <h2>This session</h2>
          <ul>
            {history.slice(1).map((item, index) => (
              <li key={`${item.expression}-${index}`}>
                {item.expression} · {item.total}
              </li>
            ))}
          </ul>
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
