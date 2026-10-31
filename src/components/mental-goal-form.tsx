"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createGoal } from "@/lib/actions/activity";
import { CMART_CHECKS } from "@/lib/rules/cmart";
import type { ActionResult } from "@/lib/types";

const empty: ActionResult | null = null;

export function MentalGoalForm({ required, onSaved }: { required: boolean; onSaved: () => void }) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("intelligence");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [clear, setClear] = useState(false);
  const [attainable, setAttainable] = useState(false);
  const [relevant, setRelevant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => createGoal(formData),
    empty,
  );

  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;
  useEffect(() => {
    if (state && "ok" in state) savedRef.current();
    if (state && "error" in state) setError(state.error);
  }, [state]);

  function nextFromGoal() {
    if (!title.trim()) {
      setError("Write the goal.");
      return;
    }
    setError(null);
    setStep(required ? 1 : 0);
  }

  if (!required) {
    return (
      <form noValidate action={formAction} className="flex flex-col gap-3" onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        if (!String(data.get("title") ?? "").trim()) {
          event.preventDefault();
          setError("Write the goal.");
          return;
        }
        setError(null);
      }}>
        <label>
          Goal
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Stat
          <select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="intelligence">Intelligence</option>
            <option value="wisdom">Wisdom</option>
          </select>
        </label>
        <label>
          What done looks like
          <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Due
          <input type="date" name="period_end" value={due} onChange={(event) => setDue(event.target.value)} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button className="primary" type="submit" disabled={pending}>
          {pending ? "Saving" : "Save mental goal"}
        </button>
      </form>
    );
  }

  const prompts = {
    clear: CMART_CHECKS[0],
    measure: CMART_CHECKS[1],
    attainable: CMART_CHECKS[2],
    relevant: CMART_CHECKS[3],
    timed: CMART_CHECKS[4],
  };

  return (
    <form
      noValidate
      action={formAction}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        if (step !== 5 || !due) {
          event.preventDefault();
          setError(due ? "Finish the five checks first." : "Name the day it is due.");
        }
      }}
    >
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="period_end" value={due} />
      {clear ? <input type="hidden" name="cmart_clear" value="on" /> : null}
      {description.trim() ? <input type="hidden" name="cmart_measurable" value="on" /> : null}
      {attainable ? <input type="hidden" name="cmart_attainable" value="on" /> : null}
      {relevant ? <input type="hidden" name="cmart_relevant" value="on" /> : null}
      {due ? <input type="hidden" name="cmart_timed" value="on" /> : null}
      {step === 0 ? (
        <>
          <label>
            Goal
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Stat
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="intelligence">Intelligence</option>
              <option value="wisdom">Wisdom</option>
            </select>
          </label>
          <button className="primary" type="button" onClick={nextFromGoal}>
            Continue
          </button>
        </>
      ) : null}
      {step === 1 ? (
        <>
          <p>{prompts.clear.prompt}</p>
          <button className="primary" type="button" onClick={() => { setClear(true); setError(null); setStep(2); }}>
            Yes, it is clear
          </button>
          <button type="button" className="secondary" onClick={() => setError(prompts.clear.prompt)}>
            Not yet
          </button>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <p>{prompts.measure.prompt}</p>
          <label>
            What done looks like
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button
            className="primary"
            type="button"
            onClick={() => {
              if (!description.trim()) {
                setError("Say what done looks like.");
                return;
              }
              setError(null);
              setStep(3);
            }}
          >
            Continue
          </button>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <p>{prompts.attainable.prompt}</p>
          <button className="primary" type="button" onClick={() => { setAttainable(true); setError(null); setStep(4); }}>
            Yes, I can finish it
          </button>
          <button type="button" className="secondary" onClick={() => setError(prompts.attainable.prompt)}>
            Not yet
          </button>
        </>
      ) : null}
      {step === 4 ? (
        <>
          <p>{prompts.relevant.prompt}</p>
          <button className="primary" type="button" onClick={() => { setRelevant(true); setError(null); setStep(5); }}>
            Yes, it belongs
          </button>
          <button type="button" className="secondary" onClick={() => setError(prompts.relevant.prompt)}>
            Not yet
          </button>
        </>
      ) : null}
      {step === 5 ? (
        <>
          <p>{prompts.timed.prompt}</p>
          <label>
            Due
            <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={pending || !due} onClick={(event) => {
            if (!due) {
              event.preventDefault();
              setError("Name the day it is due.");
            }
          }}>
            {pending ? "Saving" : "Save mental goal"}
          </button>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
