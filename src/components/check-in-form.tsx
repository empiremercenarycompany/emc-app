"use client";

import { useActionState, useState, type ReactNode } from "react";
import { submitCheckin } from "@/lib/actions/campaign";
import { Choice } from "@/components/choice";
import { checkinScore, workoutsForMark } from "@/lib/rules/checkin";
import type { ActionResult } from "@/lib/types";

type Mark = 0 | 1 | 2;

export function CheckInForm({ defaultWeek }: { defaultWeek: string }) {
  const [workouts, setWorkouts] = useState<Mark>(0);
  const [wis, setWis] = useState(false);
  const [intelligence, setIntelligence] = useState(false);
  const [charisma, setCharisma] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => submitCheckin(formData),
    null,
  );
  const total = checkinScore({
    workouts: workoutsForMark(workouts),
    wis,
    int: intelligence,
    cha: charisma,
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label>
        Week starting Monday
        <input type="date" name="week_start" required defaultValue={defaultWeek} />
      </label>
      <ScoreCard title="Workouts" line="0 is one session or none. 1 is two. 2 is three or more.">
        <TapRow name="workout-mark" value={workouts} onChange={setWorkouts} />
      </ScoreCard>
      <ScoreCard title="Wisdom" line="Met or missed. A miss lowers the week by one, unless workouts already scored 0.">
        <YesNo pressed={wis} onChange={setWis} label="Wisdom" />
      </ScoreCard>
      <ScoreCard title="Intelligence" line="Met or missed. A miss lowers the week by one, unless workouts already scored 0.">
        <YesNo pressed={intelligence} onChange={setIntelligence} label="Intelligence" />
      </ScoreCard>
      <ScoreCard title="Charisma" line="Met or missed. A miss lowers the week by one, unless workouts already scored 0.">
        <YesNo pressed={charisma} onChange={setCharisma} label="Charisma" />
      </ScoreCard>
      <p>
        This week&apos;s mark is {total}.
      </p>
      <input type="hidden" name="workouts" value={workoutsForMark(workouts)} />
      {wis ? <input type="hidden" name="wis" value="on" /> : null}
      {intelligence ? <input type="hidden" name="int_mark" value="on" /> : null}
      {charisma ? <input type="hidden" name="cha" value="on" /> : null}
      <details className="border border-bronze p-3">
        <summary>More options</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label>
            Bonus count
            <input name="bonus_count" inputMode="numeric" defaultValue="0" />
          </label>
          <label>
            Bonus activities
            <textarea name="bonus_activities" />
          </label>
          <label>
            Note
            <textarea name="note" />
          </label>
          <Choice name="injury_sub">Injury or at-home substitution</Choice>
        </div>
      </details>
      <button className="primary" disabled={pending} type="submit">
        {pending ? "Saving" : "Submit check-in"}
      </button>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
      {state && "ok" in state ? <p role="status">Saved. This week&apos;s mark is {total}.</p> : null}
    </form>
  );
}

function ScoreCard({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <fieldset className="score-card">
      <legend>{title}</legend>
      <p className="text-mute">{line}</p>
      {children}
    </fieldset>
  );
}

function TapRow({ name, value, onChange }: { name: string; value: Mark; onChange: (mark: Mark) => void }) {
  return (
    <div className="score-taps" role="radiogroup" aria-label={name}>
      {([2, 1, 0] as const).map((mark) => (
        <button
          key={mark}
          type="button"
          className={value === mark ? "primary" : "secondary"}
          aria-pressed={value === mark}
          onClick={() => onChange(mark)}
        >
          {mark}
        </button>
      ))}
    </div>
  );
}

function YesNo({
  pressed,
  onChange,
  label,
}: {
  pressed: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="score-taps" role="radiogroup" aria-label={label}>
      <button type="button" className={pressed ? "primary" : "secondary"} aria-pressed={pressed} onClick={() => onChange(true)}>
        Met
      </button>
      <button
        type="button"
        className={!pressed ? "primary" : "secondary"}
        aria-pressed={!pressed}
        onClick={() => onChange(false)}
      >
        Missed
      </button>
    </div>
  );
}
