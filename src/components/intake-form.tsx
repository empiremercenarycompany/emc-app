"use client";

import { useActionState, useState } from "react";
import { Choice } from "@/components/choice";
import { saveIntake } from "@/lib/actions/intake";
import { DND_LEVELS, GYM_LEVELS, GOAL_CHIPS, intakeError } from "@/lib/rules/intake";
import type { ActionResult } from "@/lib/types";

export function IntakeForm({
  slots,
  initial,
}: {
  slots: { id: string; label: string; adultsOnly: boolean }[];
  initial?: {
    dnd: string;
    gym: string;
    goals: string[];
    timeslot: string;
    reminders: boolean;
  };
}) {
  const [dnd, setDnd] = useState(initial?.dnd ?? "never");
  const [gym, setGym] = useState(initial?.gym ?? "new");
  const [goals, setGoals] = useState<string[]>(initial?.goals ?? ["Sleep 7 hours"]);
  const [custom, setCustom] = useState("");
  const [timeslot, setTimeslot] = useState(initial?.timeslot ?? slots[0]?.id ?? "morning");
  const [reminders, setReminders] = useState(initial?.reminders ?? false);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => saveIntake(formData),
    null,
  );
  const chosen = custom.trim() ? [...goals.filter((goal) => goal !== custom.trim()), custom.trim()] : goals;
  const problem = intakeError({ dnd, gym, goals: chosen, timeslot });

  function toggleGoal(goal: string) {
    setGoals((current) => (current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset className="score-card">
        <legend>Played before?</legend>
        <div className="score-taps" role="radiogroup" aria-label="Played before?">
          {DND_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              className={dnd === level.id ? "primary" : "secondary"}
              aria-pressed={dnd === level.id}
              onClick={() => setDnd(level.id)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="score-card">
        <legend>Gym experience?</legend>
        <div className="score-taps" role="radiogroup" aria-label="Gym experience?">
          {GYM_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              className={gym === level.id ? "primary" : "secondary"}
              aria-pressed={gym === level.id}
              onClick={() => setGym(level.id)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="score-card">
        <legend>First goals</legend>
        <p className="text-mute">Pick any that fit. You can add your own.</p>
        <div className="score-taps">
          {GOAL_CHIPS.map((goal) => (
            <button
              key={goal}
              type="button"
              className={goals.includes(goal) ? "primary" : "secondary"}
              aria-pressed={goals.includes(goal)}
              onClick={() => toggleGoal(goal)}
            >
              {goal}
            </button>
          ))}
        </div>
        <label>
          Or write your own
          <input value={custom} onChange={(event) => setCustom(event.target.value)} maxLength={80} />
        </label>
      </fieldset>
      <fieldset className="score-card">
        <legend>Preferred time</legend>
        <div className="score-taps" role="radiogroup" aria-label="Preferred time">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className={timeslot === slot.id ? "primary" : "secondary"}
              aria-pressed={timeslot === slot.id}
              onClick={() => setTimeslot(slot.id)}
            >
              {slot.adultsOnly ? `${slot.label} (18+)` : slot.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Choice name="reminders" checked={reminders} onChange={setReminders}>
        Session reminders
      </Choice>
      <p className="text-mute">The Company keeps this preference. This app does not send mail.</p>
      {/* JOHN: undecided. Do not add injuries, medical info, or emergency contact until that decision is made. */}
      <p className="text-mute" data-john="undecided-intake">
        This form does not ask about injuries, medical notes, or an emergency contact.
      </p>
      <input type="hidden" name="dnd" value={dnd} />
      <input type="hidden" name="gym" value={gym} />
      <input type="hidden" name="timeslot" value={timeslot} />
      {chosen.map((goal) => (
        <input key={goal} type="hidden" name="goal" value={goal} />
      ))}
      {problem ? <p role="alert">{problem}</p> : null}
      <button className="primary" type="submit" disabled={pending || Boolean(problem)}>
        {pending ? "Saving" : "Save"}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
