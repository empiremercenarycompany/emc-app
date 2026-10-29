import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { JournalBuilder, type MenuExercise } from "@/components/journal-builder";
import { Notice, Page, Panel } from "@/components/ui";
import { assignTemplate, flagExercise, saveExercise, savePool, saveTemplate } from "@/lib/actions/journal";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export default async function JournalPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const curator = viewer.role === "curator";

  const exercises =
    supabase && viewer.guildId
      ? (
          await supabase
            .from("exercises")
            .select("id, name, focus, status, cues")
            .eq("guild_id", viewer.guildId)
            .order("name")
        ).data
      : [];
  const pools =
    supabase && viewer.guildId
      ? (await supabase.from("exercise_pools").select("id, title, shared").eq("guild_id", viewer.guildId)).data
      : [];
  const items =
    supabase && (pools ?? []).length
      ? (
          await supabase
            .from("exercise_pool_items")
            .select("pool_id, exercise_id")
            .in(
              "pool_id",
              (pools ?? []).map((pool) => pool.id),
            )
        ).data
      : [];
  const flags =
    supabase && viewer.guildId
      ? (await supabase.from("exercise_flags").select("exercise_id").eq("guild_id", viewer.guildId)).data
      : [];
  const flagged = new Set((flags ?? []).map((flag) => flag.exercise_id));
  const workout =
    supabase && viewer.character
      ? (
          await supabase
            .from("player_workouts")
            .select("id, title, pool_id, player_workout_exercises(exercise_id, position, target_sets, target_reps, target_weight)")
            .eq("character_id", viewer.character.id)
            .maybeSingle()
        ).data
      : null;
  const assignments =
    supabase && viewer.character
      ? (
          await supabase
            .from("template_assignments")
            .select("template_id, workout_templates(pool_id)")
            .eq("character_id", viewer.character.id)
            .is("ended_at", null)
        ).data
      : [];

  const allowed = new Set<string>();
  for (const pool of pools ?? []) {
    if (pool.shared) allowed.add(pool.id);
  }
  if (workout?.pool_id) allowed.add(workout.pool_id);
  for (const assignment of assignments ?? []) {
    const template = Array.isArray(assignment.workout_templates)
      ? assignment.workout_templates[0]
      : assignment.workout_templates;
    if (template?.pool_id) allowed.add(template.pool_id);
  }

  const byId = new Map((exercises ?? []).map((exercise) => [exercise.id, exercise]));
  const exercisesByPool: Record<string, MenuExercise[]> = {};
  for (const item of items ?? []) {
    if (!allowed.has(item.pool_id)) continue;
    const exercise = byId.get(item.exercise_id);
    if (!exercise || exercise.status !== "approved") continue;
    exercisesByPool[item.pool_id] ??= [];
    exercisesByPool[item.pool_id].push({
      id: exercise.id,
      name: exercise.name,
      focus: exercise.focus,
      flagged: flagged.has(exercise.id),
    });
  }
  const menuPools = (pools ?? []).filter((pool) => allowed.has(pool.id)).map((pool) => ({ id: pool.id, title: pool.title }));
  const initialRows =
    workout?.player_workout_exercises
      ?.slice()
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((row: { exercise_id: string; target_sets: number | null; target_reps: number | null; target_weight: number | null }) => {
        const exercise = byId.get(row.exercise_id);
        return {
          exercise_id: row.exercise_id,
          name: exercise?.name ?? "Exercise",
          focus: exercise?.focus ?? "",
          flagged: flagged.has(row.exercise_id),
          target_sets: row.target_sets?.toString() ?? "",
          target_reps: row.target_reps?.toString() ?? "",
          target_weight: row.target_weight?.toString() ?? "",
        };
      }) ?? [];

  const templates =
    curator && supabase
      ? (await supabase.from("workout_templates").select("id, title, pool_id")).data
      : [];
  const people =
    curator && supabase && viewer.guildId
      ? (await supabase.from("characters").select("id, name").eq("guild_id", viewer.guildId)).data
      : [];

  return (
    <Page title="Journal" lede="Approved exercises only. Drag or tap to build the list, then record the session.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? <Link href="/sign-in">Sign in</Link> : null}
      {viewer.character ? (
        <JournalBuilder
          pools={menuPools}
          exercisesByPool={exercisesByPool}
          today={viewer.today ?? ""}
          initial={
            workout
              ? { poolId: workout.pool_id, title: workout.title, rows: initialRows }
              : null
          }
        />
      ) : viewer.userId ? (
        <Link href="/character/new">Sign the Recruit Oath before building a workout.</Link>
      ) : null}
      {curator ? (
        <Panel title="Curator">
          <ResultForm action={saveExercise} submit="Save exercise">
            <input name="name" required placeholder="Name" />
            <select name="focus" defaultValue="strength">
              <option value="strength">Strength</option>
              <option value="dexterity">Dexterity</option>
              <option value="functional">Functional</option>
            </select>
            <textarea name="cues" placeholder="Cues" />
            <select name="status" defaultValue="approved">
              <option value="approved">Approved</option>
              <option value="retired">Retired</option>
            </select>
          </ResultForm>
          <ResultForm action={savePool} submit="Save list">
            <label>
              List title
              <input name="title" required />
            </label>
            <label className="flex items-center gap-2">
              <input className="w-auto" type="checkbox" name="shared" defaultChecked /> Shared with the company
            </label>
            {(exercises ?? [])
              .filter((exercise) => exercise.status === "approved")
              .map((exercise) => (
                <label key={exercise.id} className="flex items-center gap-2">
                  <input className="w-auto" type="checkbox" name="exercise_id" value={exercise.id} />
                  {exercise.name}
                </label>
              ))}
          </ResultForm>
          <ResultForm action={saveTemplate} submit="Save template">
            <input name="title" required placeholder="Template title" />
            <select name="pool_id" required defaultValue="">
              <option value="" disabled>
                List
              </option>
              {(pools ?? []).map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.title}
                </option>
              ))}
            </select>
            {(exercises ?? [])
              .filter((exercise) => exercise.status === "approved")
              .map((exercise) => (
                <label key={exercise.id} className="flex items-center gap-2">
                  <input className="w-auto" type="checkbox" name="exercise_id" value={exercise.id} />
                  {exercise.name}
                </label>
              ))}
          </ResultForm>
          <ResultForm action={assignTemplate} submit="Assign template">
            <select name="template_id" required defaultValue="">
              <option value="" disabled>
                Template
              </option>
              {(templates ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
            <select name="character_id" required defaultValue="">
              <option value="" disabled>
                Character
              </option>
              {(people ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </ResultForm>
          <ResultForm action={flagExercise} submit="Flag exercise">
            <select name="exercise_id" required defaultValue="">
              <option value="" disabled>
                Exercise
              </option>
              {(exercises ?? []).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <input name="reward_hook" placeholder="Reward hook, optional" />
            <input type="date" name="period_start" />
            <input type="date" name="period_end" />
          </ResultForm>
          <p className="text-sm text-mute">A flag does not change attributes. TODO(John): what the hook pays.</p>
        </Panel>
      ) : null}
    </Page>
  );
}
