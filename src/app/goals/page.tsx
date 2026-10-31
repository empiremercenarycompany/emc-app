import Link from "next/link";
import { Choice } from "@/components/choice";
import { GoalRewardForm } from "@/components/goal-reward-form";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { completeShortTermGoal, createGoal, logGoal } from "@/lib/actions/activity";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { GOAL_REWARD_BUFF_SEED, GOAL_REWARD_READY, LEVEL_FOUR_STEPS_DEFAULT, levelFourProgress, showsLevelFourProgress } from "@/lib/rules/level-four";
import { isLogApprover } from "@/lib/types";

const CATEGORIES = [
  ["constitution", "Nutrition and sleep"],
  ["intelligence", "Intelligence"],
  ["wisdom", "Wisdom"],
  ["charisma", "Charisma"],
] as const;

type GoalRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  is_active: boolean;
  is_long_term: boolean;
  parent_id: string | null;
  completed_at: string | null;
  period_start: string | null;
  period_end: string | null;
};

type RewardRow = {
  id: string;
  goal_id: string;
  status: string;
  buff_id: string | null;
  buff_other: string | null;
  story_reward: string | null;
};

export default async function GoalsPage() {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const goals =
    supabase && viewer.character
      ? (
          await supabase
            .from("goals")
            .select("id, title, category, description, is_active, is_long_term, parent_id, completed_at, period_start, period_end")
            .eq("character_id", viewer.character.id)
            .order("created_at", { ascending: false })
        ).data
      : [];
  const rewards =
    supabase && viewer.character
      ? (
          await supabase
            .from("goal_rewards")
            .select("id, goal_id, status, buff_id, buff_other, story_reward")
            .eq("character_id", viewer.character.id)
        ).data
      : [];
  const buffRows =
    supabase
      ? (await supabase.from("goal_reward_buffs").select("id, name, enabled").eq("enabled", true).order("sort_order")).data
      : null;
  const buffs = (buffRows ?? [...GOAL_REWARD_BUFF_SEED]).map((row) => ({ id: row.id, name: row.name }));
  const rows = (goals ?? []) as GoalRow[];
  const rewardByGoal = new Map(((rewards ?? []) as RewardRow[]).map((reward) => [reward.goal_id, reward]));
  const parents = rows.filter((goal) => goal.is_long_term && !goal.parent_id);
  const weekly = rows.filter((goal) => !goal.is_long_term && !goal.parent_id);
  const stepsFor = (parentId: string) => rows.filter((goal) => goal.parent_id === parentId);
  const finishedSteps = rows.filter((goal) => goal.parent_id && goal.completed_at).length;
  const toward =
    viewer.character && showsLevelFourProgress(viewer.character.level)
      ? levelFourProgress(finishedSteps, viewer.config?.level_four_steps_required ?? LEVEL_FOUR_STEPS_DEFAULT)
      : null;
  const buffName = (reward: RewardRow) =>
    reward.buff_other || buffs.find((buff) => buff.id === reward.buff_id)?.name || "Buff recorded";

  return (
    <Page
      title="Goals"
      lede="Nutrition and sleep feed Constitution. Mental goals feed Intelligence or Wisdom. Social goals feed Charisma."
      mark={false}
    >
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.character ? (
        <Link href={viewer.userId ? "/character/new" : "/sign-in"}>
          {viewer.userId ? "Fill Out Recruitment Papers first." : "Join the Company first."}
        </Link>
      ) : (
        <>
          {toward ? (
            <Panel paper wide>
              <p className="eyebrow">Toward level 4</p>
              <p className="progress-fraction">{toward.label}</p>
              <p>Completed short-term goals. The count is set in company config. It is {toward.required} right now.</p>
            </Panel>
          ) : (
            <Panel wide>
              <p>Levels 1 to 3 still follow the milestone weeks. Short-term steps start counting toward level 4 once you reach level 3.</p>
            </Panel>
          )}
          <Panel title="Long-term goal" wide>
            <p>Name the long aim, then add the short-term steps under it. Finishing a step does not grant anything by itself.</p>
            <ResultForm action={createGoal} submit="Save long-term goal" primary>
              <input type="hidden" name="is_long_term" value="on" />
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
            </ResultForm>
          </Panel>
          {parents.map((goal) => (
            <Panel key={goal.id} title={goal.title} paper>
              <p className="text-mute">{CATEGORIES.find(([value]) => value === goal.category)?.[1] ?? goal.category}</p>
              {goal.description ? <p>{goal.description}</p> : null}
              {stepsFor(goal.id).map((step) => {
                const reward = rewardByGoal.get(step.id);
                return (
                  <article key={step.id}>
                    <h3>{step.title}</h3>
                    {step.description ? <p>{step.description}</p> : null}
                    {step.completed_at ? (
                      reward?.status === "recorded" ? (
                        <>
                          <p>{buffName(reward)}</p>
                          {reward.story_reward ? <p>{reward.story_reward}</p> : null}
                        </>
                      ) : (
                        <p>{GOAL_REWARD_READY}</p>
                      )
                    ) : (
                      <ResultForm action={completeShortTermGoal} submit="Finish this step">
                        <input type="hidden" name="goal_id" value={step.id} />
                      </ResultForm>
                    )}
                    {reward?.status === "ready" && isLogApprover(viewer.role) ? (
                      <GoalRewardForm rewardId={reward.id} buffs={buffs} />
                    ) : null}
                  </article>
                );
              })}
              <ResultForm action={createGoal} submit="Add a short-term step">
                <input type="hidden" name="parent_id" value={goal.id} />
                <input type="hidden" name="category" value={goal.category} />
                <label>
                  Step
                  <input name="title" required />
                </label>
                <label>
                  What done looks like
                  <textarea name="description" />
                </label>
              </ResultForm>
            </Panel>
          ))}
          <Panel title="This period" wide>
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
            <p>A monthly period must stay inside one calendar month. A long-term goal here still needs short-term steps before it counts toward level 4.</p>
          </Panel>
          {weekly.map((goal) => (
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
