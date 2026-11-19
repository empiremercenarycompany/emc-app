"use client";

import { useActionState, useState } from "react";
import { ENLIST_BACKSTORY_PROMPT, ENLIST_CITY_BLURB } from "@/content/enlist";
import { Choice } from "@/components/choice";
import { saveIntake } from "@/lib/actions/intake";
import { DND_LEVELS, ENLIST_LIMITS, GOAL_CHIPS, GYM_LEVELS, intakeError } from "@/lib/rules/intake";
import type { ActionResult } from "@/lib/types";

export function IntakeForm({
  slots,
  canSave = true,
  initial,
}: {
  slots: { id: string; label: string; adultsOnly: boolean }[];
  canSave?: boolean;
  initial?: {
    dnd: string;
    gym: string;
    goals: string[];
    timeslot: string;
    reminders: boolean;
    phone: string;
    species: string;
    classIdea: string;
    fitness: string;
    backstory: string;
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
      <section id="enlist-details" aria-labelledby="enlist-heading" className="flex flex-col gap-4">
        <h2 id="enlist-heading">Enlist details</h2>
        <label>
          Phone
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={ENLIST_LIMITS.phone}
            defaultValue={initial?.phone ?? ""}
            aria-describedby="phone-optional"
          />
        </label>
        <p className="text-mute" id="phone-optional">
          Optional.
        </p>
        <fieldset className="score-card">
          <legend>Training slot</legend>
          <div className="score-taps" role="radiogroup" aria-label="Training slot">
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
        <label>
          Species idea
          <input name="species" maxLength={ENLIST_LIMITS.species} defaultValue={initial?.species ?? ""} />
        </label>
        <label>
          Class idea
          <input name="class_idea" maxLength={ENLIST_LIMITS.classIdea} defaultValue={initial?.classIdea ?? ""} />
        </label>
        <fieldset className="score-card">
          <legend>Fitness goals and experience</legend>
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
          <p className="text-mute">Gym experience</p>
          <div className="score-taps" role="radiogroup" aria-label="Gym experience">
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
          <label>
            Fitness experience
            <textarea
              name="fitness"
              rows={3}
              maxLength={ENLIST_LIMITS.fitness}
              defaultValue={initial?.fitness ?? ""}
            />
          </label>
        </fieldset>
        <fieldset className="score-card">
          <legend>D&amp;D experience</legend>
          <div className="score-taps" role="radiogroup" aria-label="D&D experience">
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
        <p className="enlist-copy">{ENLIST_CITY_BLURB}</p>
        <p className="enlist-copy" id="backstory-prompt">
          {ENLIST_BACKSTORY_PROMPT}
        </p>
        <label>
          Life before you enlisted
          <textarea
            name="backstory"
            rows={5}
            maxLength={ENLIST_LIMITS.backstory}
            aria-describedby="backstory-prompt"
            defaultValue={initial?.backstory ?? ""}
          />
        </label>
      </section>
      <Choice name="reminders" checked={reminders} onChange={setReminders}>
        Session reminders
      </Choice>
      <p className="text-mute">The Company keeps this preference. This app does not send mail.</p>
      {/* JOHN: undecided. Do not add injuries, medical info, or emergency contact until that decision is made. */}
      <p className="text-mute" data-john="undecided-intake">
        This form does not ask about injuries, medical notes, or an emergency contact.
      </p>
      <input type="hidden" name="enlist" value="1" />
      <input type="hidden" name="dnd" value={dnd} />
      <input type="hidden" name="gym" value={gym} />
      <input type="hidden" name="timeslot" value={timeslot} />
      {chosen.map((goal) => (
        <input key={goal} type="hidden" name="goal" value={goal} />
      ))}
      {problem ? <p role="alert">{problem}</p> : null}
      <button className="primary" type="submit" disabled={pending || Boolean(problem) || !canSave}>
        {pending ? "Saving" : canSave ? "Save" : "Sign in to save"}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
