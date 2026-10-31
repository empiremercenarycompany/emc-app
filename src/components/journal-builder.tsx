"use client";

import { useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { Choice } from "@/components/choice";
import { ImpactCard } from "@/components/ui";
import { logLifting, saveWorkout } from "@/lib/actions/journal";
import type { Impact } from "@/lib/types";

export type MenuExercise = {
  id: string;
  name: string;
  focus: string;
  flagged: boolean;
};

type Row = {
  exercise_id: string;
  name: string;
  focus: string;
  flagged: boolean;
  target_sets: string;
  target_reps: string;
  target_weight: string;
};

export function JournalBuilder({
  pools,
  exercisesByPool,
  initial,
  today,
}: {
  pools: { id: string; title: string }[];
  exercisesByPool: Record<string, MenuExercise[]>;
  initial: { poolId: string; title: string; rows: Row[] } | null;
  today: string;
}) {
  const [poolId, setPoolId] = useState(initial?.poolId ?? pools[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "Workout");
  const [rows, setRows] = useState<Row[]>(initial?.rows ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [share, setShare] = useState(true);
  const [actual, setActual] = useState<Record<string, { reps: string; weight: string }>>({});
  const menu = exercisesByPool[poolId] ?? [];

  function add(exercise: MenuExercise, index?: number) {
    const row: Row = {
      exercise_id: exercise.id,
      name: exercise.name,
      focus: exercise.focus,
      flagged: exercise.flagged,
      target_sets: "3",
      target_reps: "5",
      target_weight: "",
    };
    setRows((current) => {
      const next = [...current];
      next.splice(index ?? current.length, 0, row);
      return next;
    });
  }

  function onDrop(event: DragEvent, index: number) {
    event.preventDefault();
    const fromMenu = event.dataTransfer.getData("exercise-id");
    const fromRow = event.dataTransfer.getData("row-index");
    if (fromMenu) {
      const exercise = menu.find((item) => item.id === fromMenu);
      if (!exercise) return;
      if (index < rows.length && event.dataTransfer.getData("swap") === "1") {
        setRows((current) =>
          current.map((row, rowIndex) =>
            rowIndex === index
              ? { ...row, exercise_id: exercise.id, name: exercise.name, focus: exercise.focus, flagged: exercise.flagged }
              : row,
          ),
        );
        return;
      }
      add(exercise, index);
      return;
    }
    if (fromRow !== "") {
      const source = Number(fromRow);
      setRows((current) => {
        const next = [...current];
        const [moved] = next.splice(source, 1);
        if (!moved) return current;
        const target = source < index ? index - 1 : index;
        next.splice(target, 0, moved);
        return next;
      });
    }
  }

  async function persist() {
    const result = await saveWorkout({
      poolId,
      title,
      exercises: rows.map((row) => ({
        exercise_id: row.exercise_id,
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        target_weight: row.target_weight,
      })),
    });
    setImpact(null);
    setMessage("error" in result ? result.error : "Workout saved. Saving the list does not change your attributes.");
  }

  async function logSession() {
    const sets = rows.flatMap((row) => {
      const key = row.exercise_id;
      const values = actual[key] ?? { reps: row.target_reps, weight: row.target_weight };
      return [{ exercise_id: row.exercise_id, reps: values.reps, weight: values.weight, notes: "" }];
    });
    const result = await logLifting({
      date,
      notes,
      shareWithSquad: share,
      playerWorkoutId: null,
      sets,
    });
    if ("error" in result) {
      setImpact(null);
      setMessage(result.error);
      return;
    }
    if ("impact" in result) {
      setMessage(null);
      setImpact(result.impact);
    }
  }

  if (pools.length === 0) {
    return <p className="text-mute">No exercise list is on your menu yet. A curator shares one, or assigns a template.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <label>
        List
        <select
          value={poolId}
          onChange={(event) => {
            setPoolId(event.target.value);
            setRows([]);
          }}
        >
          {pools.map((pool) => (
            <option key={pool.id} value={pool.id}>
              {pool.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Workout title
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="border border-steel p-3">
          <h2>Approved</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {menu.map((exercise) => (
              <li key={exercise.id}>
                <button
                  className="secondary w-full"
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("exercise-id", exercise.id);
                    event.dataTransfer.setData("swap", "0");
                  }}
                  onClick={() => add(exercise)}
                >
                  {exercise.name}
                  <span className="ml-2 text-mute">{exercise.focus}</span>
                  {exercise.flagged ? <span className="ml-2 text-mute">Flagged</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section
          className="border border-steel p-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => onDrop(event, rows.length)}
        >
          <h2>Your workout</h2>
          {rows.length === 0 ? <p className="mt-2 text-mute">Drop an approved exercise here, or tap one.</p> : null}
          <ol className="mt-2 flex flex-col gap-2">
            {rows.map((row, index) => (
              <li
                key={`${row.exercise_id}-${index}`}
                className="border border-steel p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, index)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("row-index", String(index));
                    }}
                  >
                    {index + 1}. {row.name}
                    {row.flagged ? <span className="ml-2 text-mute">Flagged</span> : null}
                  </span>
                  <span className="flex gap-1">
                    <button className="secondary" type="button" onClick={() => setRows((current) => move(current, index, -1))}>
                      Up
                    </button>
                    <button className="secondary" type="button" onClick={() => setRows((current) => move(current, index, 1))}>
                      Down
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                    >
                      Remove
                    </button>
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    aria-label={`${row.name} sets`}
                    value={row.target_sets}
                    onChange={(event) => updateRow(setRows, index, { target_sets: event.target.value })}
                  />
                  <input
                    aria-label={`${row.name} reps`}
                    value={row.target_reps}
                    onChange={(event) => updateRow(setRows, index, { target_reps: event.target.value })}
                  />
                  <input
                    aria-label={`${row.name} weight`}
                    value={row.target_weight}
                    onChange={(event) => updateRow(setRows, index, { target_weight: event.target.value })}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    aria-label={`${row.name} actual reps`}
                    placeholder="Actual reps"
                    value={actual[row.exercise_id]?.reps ?? row.target_reps}
                    onChange={(event) =>
                      setActual((current) => ({
                        ...current,
                        [row.exercise_id]: {
                          reps: event.target.value,
                          weight: current[row.exercise_id]?.weight ?? row.target_weight,
                        },
                      }))
                    }
                  />
                  <input
                    aria-label={`${row.name} actual weight`}
                    placeholder="Actual weight"
                    value={actual[row.exercise_id]?.weight ?? row.target_weight}
                    onChange={(event) =>
                      setActual((current) => ({
                        ...current,
                        [row.exercise_id]: {
                          weight: event.target.value,
                          reps: current[row.exercise_id]?.reps ?? row.target_reps,
                        },
                      }))
                    }
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={persist}>
          Save workout
        </button>
        <button className="secondary" type="button" onClick={() => setRows([])}>
          Clear
        </button>
      </div>
      <label>
        Session date
        <input type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <Choice checked={share} onChange={setShare}>
        Squad can see this session
      </Choice>
      <button className="primary" type="button" onClick={logSession}>
        Record Work
      </button>
      <p className="text-sm text-mute">
        One session is one log. A flag does not change your attributes.
      </p>
      {message ? <p role="alert">{message}</p> : null}
      {impact ? <ImpactCard impact={impact} /> : null}
    </div>
  );
}

function move(rows: Row[], index: number, delta: number): Row[] {
  const target = index + delta;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  const [row] = next.splice(index, 1);
  if (!row) return rows;
  next.splice(target, 0, row);
  return next;
}

function updateRow(setRows: Dispatch<SetStateAction<Row[]>>, index: number, patch: Partial<Row>) {
  setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
}
