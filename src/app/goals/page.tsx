import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { createGoal, logGoal } from "@/lib/actions/activity";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["constitution", "intelligence", "wisdom", "charisma"] as const;

export default async function GoalsPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const goals =
    supabase && viewer.character
      ? (
          await supabase
            .from("goals")
            .select("id, title, category, description, is_active, period_start, period_end")
            .eq("character_id", viewer.character.id)
            .order("created_at", { ascending: false })
        ).data
      : [];

  return (
    <Page title="Goals" lede="Constitution goals feed the Constitution pool. The other three feed Mental.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.character ? (
        <Link href={viewer.userId ? "/character/new" : "/sign-in"}>Create a character first.</Link>
      ) : (
        <>
          <Panel title="New goal">
            <ResultForm action={createGoal} submit="Save goal">
              <input name="title" required placeholder="Title" />
              <select name="category" defaultValue="constitution">
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <textarea name="description" placeholder="What done looks like" />
              <input name="target_frequency" placeholder="How often" />
              <label className="flex items-center gap-2">
                <input className="w-auto" type="checkbox" name="is_long_term" /> Long term
              </label>
              <label>
                Period start
                <input type="date" name="period_start" />
              </label>
              <label>
                Period end
                <input type="date" name="period_end" />
              </label>
            </ResultForm>
            <p className="text-sm text-mute">
              A monthly period must stay inside one calendar month. TODO(John): goal completions use the same backfill
              window as workouts.
            </p>
          </Panel>
          {(goals ?? []).map((goal) => (
            <Panel key={goal.id} title={goal.title}>
              <p className="text-mute">
                {goal.category}
                {goal.period_start ? ` · ${goal.period_start} to ${goal.period_end}` : ""}
              </p>
              {goal.description ? <p>{goal.description}</p> : null}
              {goal.is_active ? (
                <ResultForm action={logGoal} submit="Mark complete">
                  <input type="hidden" name="goal_id" value={goal.id} />
                  <input type="date" name="date" required max={viewer.today ?? undefined} defaultValue={viewer.today ?? undefined} />
                  <textarea name="notes" placeholder="Notes" />
                </ResultForm>
              ) : (
                <p>Inactive.</p>
              )}
            </Panel>
          ))}
        </>
      )}
    </Page>
  );
}
