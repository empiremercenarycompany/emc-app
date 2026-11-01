"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { GoalRewardForm } from "@/components/goal-reward-form";
import { MentalGoalForm } from "@/components/mental-goal-form";
import { ResultForm } from "@/components/result-form";
import { EmptyState } from "@/components/empty-state";
import { Term } from "@/components/term";
import {
  chooseConstitutionGoal,
  completeShortTermGoal,
  createGoal,
  logGoal,
  markConstitutionGoalWeek,
} from "@/lib/actions/activity";
import { CON_GOAL_OPTIONS } from "@/lib/rules/constitution-goal";
import { CMART_CHECKS } from "@/lib/rules/cmart";
import { compareGoalSteps } from "@/lib/rules/goal-order";
import { GOAL_REWARD_READY } from "@/lib/rules/level-four";
import type { ActionResult } from "@/lib/types";

export type GoalView = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string | null;
  active: boolean;
  longTerm: boolean;
  parentId: string | null;
  createdAt: string;
  completed: boolean;
  markedDone: boolean;
  periodLabel: string | null;
  chips: string[];
};

export type RewardView = {
  id: string;
  goalId: string;
  status: string;
  buffName: string | null;
  story: string | null;
};

type SheetId = "con" | "mental" | "long" | "social" | `step:${string}`;

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel-pop"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DraftForm({
  submit,
  children,
  onSaved,
  extras,
}: {
  submit: string;
  children: ReactNode;
  onSaved: () => void;
  extras?: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => createGoal(formData),
    null as ActionResult | null,
  );
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
        const title = String(new FormData(event.currentTarget).get("title") ?? "").trim();
        if (!title) {
          event.preventDefault();
          setError("Write the goal.");
          return;
        }
        setError(null);
      }}
    >
      {extras}
      {children}
      {error ? <p role="alert">{error}</p> : null}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Saving" : submit}
      </button>
    </form>
  );
}

export function GoalsBoard({
  signedIn,
  hasCharacter,
  level,
  today,
  cmartOn,
  conChoice,
  conStatus,
  towardLabel,
  goals,
  rewards,
  canRecord,
  buffs,
}: {
  signedIn: boolean;
  hasCharacter: boolean;
  level: number | null;
  today: string | null;
  cmartOn: boolean;
  conChoice: string | null;
  conStatus: string | null;
  towardLabel: string | null;
  goals: GoalView[];
  rewards: RewardView[];
  canRecord: boolean;
  buffs: { id: string; name: string }[];
}) {
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const raw = window.sessionStorage.getItem("emc-goal-toast");
    if (!raw) return;
    try {
      const savedToast = JSON.parse(raw) as { message?: string; at?: number };
      if (!savedToast.message || Date.now() - (savedToast.at ?? 0) > 3000) {
        window.sessionStorage.removeItem("emc-goal-toast");
        return;
      }
      setToast(savedToast.message);
    } catch {
      window.sessionStorage.removeItem("emc-goal-toast");
    }
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      window.sessionStorage.removeItem("emc-goal-toast");
      setToast(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const parents = goals.filter((goal) => goal.longTerm && !goal.parentId);
  const weekly = goals.filter((goal) => !goal.longTerm && !goal.parentId);
  const stepsFor = (parentId: string) =>
    goals
      .filter((goal) => goal.parentId === parentId)
      .slice()
      .sort(compareGoalSteps);
  const rewardFor = (goalId: string) => rewards.find((reward) => reward.goalId === goalId) ?? null;
  const chosen = CON_GOAL_OPTIONS.find((option) => option.id === conChoice) ?? null;

  function saved(message: string) {
    window.sessionStorage.setItem("emc-goal-toast", JSON.stringify({ message, at: Date.now() }));
    setSheet(null);
    setToast(message);
  }

  return (
    <>
      {towardLabel ? (
        <article className="goal-card span-all">
          <p className="eyebrow">Toward level 4</p>
          <p className="progress-fraction">{towardLabel}</p>
          <p>Finish a step, then see your DM for your reward.</p>
        </article>
      ) : hasCharacter && level != null && level < 3 ? (
        <article className="goal-card span-all">
          <p>Levels 1 to 3 still follow the milestone weeks. Long-term goals toward level 4 open at level 3.</p>
        </article>
      ) : null}
      <article className="goal-card span-all">
        <h2>
          <Term id="con">Constitution</Term>
        </h2>
        <p>{chosen ? `${chosen.label} · ${chosen.condition}` : "Sleep, meal prep, or cardio."}</p>
        {conStatus ? (
          <p>
            {conStatus} <Term id="initiative">Initiative</Term> shows on the sheet when the condition is current.
          </p>
        ) : (
          <p>Choose one. It feeds Constitution. Meal prep can later follow a nutrition plan.</p>
        )}
        {hasCharacter && conChoice ? (
          <ResultForm action={markConstitutionGoalWeek} submit="Log this week" primary>
            <input type="hidden" name="week" value="current" />
          </ResultForm>
        ) : null}
        {hasCharacter ? (
          <button type="button" className="secondary" onClick={() => setSheet("con")}>
            {conChoice ? "Change Constitution goal" : "Choose Constitution goal"}
          </button>
        ) : null}
      </article>
      <article className="goal-card span-all">
        <h2>Intelligence and Wisdom</h2>
        <p>
          A mental goal feeds Intelligence or Wisdom. It counts when it is <Term id="cmart">CMART</Term>.
        </p>
        {weekly.filter((goal) => goal.category === "intelligence" || goal.category === "wisdom").length === 0 ? (
          <EmptyState title="No mental goal yet">
            <p>Clear, measurable, attainable, relevant, and timed.</p>
          </EmptyState>
        ) : null}
        {hasCharacter ? (
          <button type="button" className="primary" onClick={() => setSheet("mental")}>
            Add a mental goal
          </button>
        ) : null}
      </article>
      {parents.map((goal) => (
        <article key={goal.id} className="goal-card span-all">
          <h2>{goal.title}</h2>
          <p className="text-mute">{goal.categoryLabel}</p>
          {goal.description ? <p>{goal.description}</p> : null}
          {stepsFor(goal.id).map((step) => {
            const reward = rewardFor(step.id);
            return (
              <div key={step.id}>
                <h3>{step.title}</h3>
                {step.description ? <p>{step.description}</p> : null}
                {step.completed ? (
                  reward?.status === "recorded" ? (
                    <>
                      <p>{reward.buffName}</p>
                      {reward.story ? <p>{reward.story}</p> : null}
                    </>
                  ) : (
                    <p className="reward-ready">{GOAL_REWARD_READY}</p>
                  )
                ) : (
                  <ResultForm
                    action={completeShortTermGoal}
                    submit="Finish this step"
                    primary
                    done="Reward ready: see your DM"
                    celebrate
                  >
                    <input type="hidden" name="goal_id" value={step.id} />
                  </ResultForm>
                )}
                {reward?.status === "ready" && canRecord ? <GoalRewardForm rewardId={reward.id} buffs={buffs} /> : null}
              </div>
            );
          })}
          <button type="button" className="secondary" onClick={() => setSheet(`step:${goal.id}`)}>
            Add a short-term step
          </button>
        </article>
      ))}
      {weekly.map((goal) => (
        <article key={goal.id} className="goal-card span-all">
          <h2>{goal.title}</h2>
          <p className="text-mute">
            {goal.categoryLabel}
            {goal.periodLabel ? ` · ${goal.periodLabel}` : ""}
          </p>
          {goal.category === "intelligence" || goal.category === "wisdom" ? (
            <p className="goal-chips" aria-label="CMART">
              {CMART_CHECKS.map((check) => {
                const on = goal.chips.includes(check.letter);
                return (
                  <span key={check.id} className={on ? "is-on" : undefined}>
                    {check.letter}
                    <span className="sr-only">
                      {check.name} {on ? "on" : "off"}
                    </span>
                  </span>
                );
              })}
            </p>
          ) : null}
          {goal.description ? <p>{goal.description}</p> : null}
          {goal.markedDone ? <p>Done.</p> : null}
          {!goal.active && (goal.category === "intelligence" || goal.category === "wisdom") ? (
            <p>Not counting yet. All five checks have to be on.</p>
          ) : null}
          {goal.active ? (
            <ResultForm action={logGoal} submit="Done" primary>
              <input type="hidden" name="goal_id" value={goal.id} />
              <input type="date" name="date" max={today ?? undefined} defaultValue={today ?? undefined} />
              <textarea name="notes" placeholder="Notes" />
            </ResultForm>
          ) : (
            <p>Inactive.</p>
          )}
        </article>
      ))}
      {hasCharacter && level === 3 ? (
        <button type="button" className="primary" onClick={() => setSheet("long")}>
          Add a long-term goal
        </button>
      ) : null}
      {hasCharacter ? (
        <button type="button" className="secondary" onClick={() => setSheet("social")}>
          Add a Charisma goal
        </button>
      ) : (
        <Link href={signedIn ? "/character/new" : "/sign-in"}>
          {signedIn ? "Fill Out Recruitment Papers first." : "Join the Company first."}
        </Link>
      )}
      {sheet === "con" ? (
        <Sheet title="Constitution" onClose={() => setSheet(null)}>
          <ConstitutionSheet choice={conChoice} onSaved={() => saved("Goal set.")} />
        </Sheet>
      ) : null}
      {sheet === "mental" ? (
        <Sheet title="Mental goal" onClose={() => setSheet(null)}>
          <MentalGoalForm required={cmartOn} onSaved={() => saved("Goal set.")} />
        </Sheet>
      ) : null}
      {sheet === "long" ? (
        <Sheet title="Long-term goal" onClose={() => setSheet(null)}>
          <DraftForm
            submit="Save long-term goal"
            onSaved={() => saved("Goal set.")}
            extras={<input type="hidden" name="is_long_term" value="on" />}
          >
            <label>
              Goal
              <input name="title" />
            </label>
            <label>
              Kind
              <select name="category" defaultValue="constitution">
                <option value="constitution">Nutrition and sleep</option>
                <option value="intelligence">Intelligence</option>
                <option value="wisdom">Wisdom</option>
                <option value="charisma">Charisma</option>
              </select>
            </label>
            <label>
              What done looks like
              <textarea name="description" />
            </label>
            <p>Finish a step, then see your DM for your reward.</p>
          </DraftForm>
        </Sheet>
      ) : null}
      {sheet?.startsWith("step:") ? (
        <Sheet title="Short-term step" onClose={() => setSheet(null)}>
          <DraftForm
            submit="Add a short-term step"
            onSaved={() => saved("Goal set.")}
            extras={
              <>
                <input type="hidden" name="parent_id" value={sheet.slice(5)} />
                <input
                  type="hidden"
                  name="category"
                  value={parents.find((goal) => goal.id === sheet.slice(5))?.category ?? "constitution"}
                />
              </>
            }
          >
            <label>
              Step
              <input name="title" />
            </label>
            <label>
              What done looks like
              <textarea name="description" />
            </label>
          </DraftForm>
        </Sheet>
      ) : null}
      {sheet === "social" ? (
        <Sheet title="Charisma" onClose={() => setSheet(null)}>
          <DraftForm submit="Save goal" onSaved={() => saved("Goal set.")}>
            <label>
              Goal
              <input name="title" />
            </label>
            <input type="hidden" name="category" value="charisma" />
            <label>
              What done looks like
              <textarea name="description" />
            </label>
            <label>
              How often
              <input name="target_frequency" />
            </label>
            <label>
              Period start
              <input type="date" name="period_start" />
            </label>
            <label>
              Period end
              <input type="date" name="period_end" />
            </label>
            <p>A monthly period must stay inside one calendar month.</p>
          </DraftForm>
        </Sheet>
      ) : null}
      {toast
        ? createPortal(
            <p className="toast-banner" role="status" aria-live="polite">
              {toast}
            </p>,
            document.body,
          )
        : null}
    </>
  );
}

function ConstitutionSheet({ choice, onSaved }: { choice: string | null; onSaved: () => void }) {
  const [option, setOption] = useState(choice ?? "");
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => chooseConstitutionGoal(formData),
    null as ActionResult | null,
  );
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
        if (!option) {
          event.preventDefault();
          setError("Choose a Constitution goal.");
        }
      }}
    >
      <input type="hidden" name="option_id" value={option} />
      {CON_GOAL_OPTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={option === item.id ? "primary" : "secondary"}
          onClick={() => setOption(item.id)}
        >
          {item.label} · {item.condition}
        </button>
      ))}
      {error ? <p role="alert">{error}</p> : null}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Saving" : "Save Constitution goal"}
      </button>
    </form>
  );
}
