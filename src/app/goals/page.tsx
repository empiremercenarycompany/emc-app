import Link from "next/link";
import { Choice } from "@/components/choice";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { createGoal, logGoal } from "@/lib/actions/activity";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = [
  ["constitution", "Nutrition and sleep"],
  ["intelligence", "Intelligence"],
  ["wisdom", "Wisdom"],
  ["charisma", "Charisma"],
] as const;

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
    <Page title="Goals" lede="Nutrition and sleep feed Constitution. Mental goals feed Intelligence or Wisdom. Social goals feed Charisma.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.character ? (
        <Link href={viewer.userId ? "/character/new" : "/sign-in"}>
          {viewer.userId ? "Fill Out Recruitment Papers first." : "Join the Company first."}
        </Link>
      ) : (
        <>
          <Panel title="New goal">
            <ResultForm action={createGoal} submit="Save goal" primary>
              <label>
                Goal
                <input name="title" required />
              </label>
              <label>
                Kind
                <select name="category" defaultValue="constitution">
                  {CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                What done looks like
                <textarea name="description" />
              </label>
              <label>
                How often
                <input name="target_frequency" />
              </label>
              <Choice name="is_long_term">Long term</Choice>
              <label>
                Period start
                <input type="date" name="period_start" />
              </label>
              <label>
                Period end
                <input type="date" name="period_end" />
              </label>
            </ResultForm>
            <p className="text-sm text-mute">A monthly period must stay inside one calendar month.</p>
          </Panel>
          {(goals ?? []).map((goal) => (
            <Panel key={goal.id} title={goal.title}>
              <p className="text-mute">
                {CATEGORIES.find(([value]) => value === goal.category)?.[1] ?? goal.category}
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
