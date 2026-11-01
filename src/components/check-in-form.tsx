"use client";

import { useActionState, useState, type ReactNode } from "react";
import { submitCheckin } from "@/lib/actions/campaign";
import { Choice } from "@/components/choice";
import { checkinScore, workoutsForMark } from "@/lib/rules/checkin";
import type { ActionResult } from "@/lib/types";

type Mark = 0 | 1 | 2;

const WORKOUTS: { mark: Mark; label: string }[] = [
  { mark: 0, label: "0–1 sessions" },
  { mark: 1, label: "2 sessions" },
  { mark: 2, label: "3 or more sessions" },
];

export function CheckInForm({ defaultWeek }: { defaultWeek: string }) {
  const [workouts, setWorkouts] = useState<Mark | null>(null);
  const [wis, setWis] = useState<boolean | null>(null);
  const [intelligence, setIntelligence] = useState<boolean | null>(null);
  const [charisma, setCharisma] = useState<boolean | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => submitCheckin(formData),
    null,
  );
  const answers = [workouts, wis, intelligence, charisma];
  const filed = answers.filter((value) => value !== null).length;
  const ready = filed === 4 && workouts !== null && wis !== null && intelligence !== null && charisma !== null;
  const total = ready
    ? checkinScore({
        workouts: workoutsForMark(workouts),
        wis,
        int: intelligence,
        cha: charisma,
      })
    : null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="check-progress" aria-hidden="true">
        {answers.map((value, index) => (
          <span key={index} className={value !== null ? "on" : undefined} />
        ))}
      </div>
      <label>
        Week starting Monday
        <input type="date" name="week_start" required defaultValue={defaultWeek} />
      </label>
      <ScoreCard title="Workouts" line="How many sessions did you get in this week?">
        <div className="choice-grid three" role="radiogroup" aria-label="Workouts">
          {WORKOUTS.map((option) => (
            <button
              key={option.mark}
              type="button"
              aria-pressed={workouts === option.mark}
              onClick={() => setWorkouts(option.mark)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </ScoreCard>
      <ScoreCard title="Wisdom" line="Did you meet your goal this week?">
        <YesNo value={wis} onChange={setWis} label="Wisdom" />
      </ScoreCard>
      <ScoreCard title="Intelligence" line="Did you meet your goal this week?">
        <YesNo value={intelligence} onChange={setIntelligence} label="Intelligence" />
      </ScoreCard>
      <ScoreCard title="Charisma" line="Did you meet your goal this week?">
        <YesNo value={charisma} onChange={setCharisma} label="Charisma" />
      </ScoreCard>
      <p className="miss-note">A miss isn&apos;t failure. It tells us where to help. Nothing here locks your character.</p>
      {ready && workouts !== null ? <input type="hidden" name="workouts" value={workoutsForMark(workouts)} /> : null}
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
      {total != null ? <p>This week&apos;s mark is {total}.</p> : null}
      <button className="primary" disabled={pending || !ready} type="submit">
        {pending ? "Saving" : ready ? "File your check-in" : `${4 - filed} more to go`}
      </button>
      <p className="text-mute">Due Friday, 11:59 PM. You can change answers until then.</p>
      {state && "error" in state ? <p role="alert">{state.error}</p> : null}
      {state && "ok" in state ? <p role="status">Saved.</p> : null}
    </form>
  );
}

function ScoreCard({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <fieldset className="paper">
      <legend className="sheet-name">{title}</legend>
      <p>{line}</p>
      {children}
    </fieldset>
  );
}

function YesNo({
  value,
  onChange,
  label,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="choice-grid two" role="radiogroup" aria-label={label}>
      <button type="button" aria-pressed={value === true} onClick={() => onChange(true)}>
        Yes
        <span className="block text-sm normal-case">I met it</span>
      </button>
      <button type="button" aria-pressed={value === false} onClick={() => onChange(false)}>
        Not this week
        <span className="block text-sm normal-case">That&apos;s okay</span>
      </button>
    </div>
  );
}
