import { GoalsBoard, type GoalView, type RewardView } from "@/components/goals-board";
import { Notice, Page } from "@/components/ui";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { GOAL_REWARD_BUFF_SEED, LEVEL_FOUR_STEPS_DEFAULT, levelFourProgress, showsLevelFourProgress } from "@/lib/rules/level-four";
import {
  constitutionGoalCurrent,
  constitutionGoalOption,
  constitutionStatusLine,
  CON_GOAL_SCORE_MIN_DEFAULT,
} from "@/lib/rules/constitution-goal";
import { cmartRequired } from "@/lib/rules/cmart";
import { currentWeekStart } from "@/lib/rules/dates";
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
  created_at?: string;
  completed_at: string | null;
  marked_done?: boolean;
  period_start: string | null;
  period_end: string | null;
  cmart_clear?: boolean;
  cmart_measurable?: boolean;
  cmart_attainable?: boolean;
  cmart_relevant?: boolean;
  cmart_timed?: boolean;
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
            .select(
              "id, title, category, description, is_active, is_long_term, parent_id, created_at, completed_at, marked_done, period_start, period_end, cmart_clear, cmart_measurable, cmart_attainable, cmart_relevant, cmart_timed",
            )
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
  const buffRows = supabase
    ? (await supabase.from("goal_reward_buffs").select("id, name, enabled").eq("enabled", true).order("sort_order")).data
    : null;
  const buffs = (buffRows ?? [...GOAL_REWARD_BUFF_SEED]).map((row) => ({ id: row.id, name: row.name }));
  const rows = (goals ?? []) as GoalRow[];
  const weekStart = currentWeekStart(viewer.today);
  const conWeek =
    supabase && viewer.character?.constitution_goal_id
      ? (
          await supabase
            .from("constitution_goal_weeks")
            .select("week_start, option_id")
            .eq("character_id", viewer.character.id)
            .eq("week_start", weekStart)
            .maybeSingle()
        ).data
      : null;
  const conOption = constitutionGoalOption(viewer.character?.constitution_goal_id);
  const scoreMin = viewer.config?.con_goal_score_min ?? CON_GOAL_SCORE_MIN_DEFAULT;
  const conStatus =
    viewer.character && conOption
      ? constitutionStatusLine({
          condition: conOption.condition,
          score: viewer.character.constitution,
          unspent: viewer.character.constitution_points,
          scoreMin,
          current: constitutionGoalCurrent({
            choiceId: viewer.character.constitution_goal_id ?? null,
            markedWeek: conWeek && conWeek.option_id === viewer.character.constitution_goal_id ? conWeek.week_start : null,
            weekStart,
          }),
          chosen: true,
        })
      : null;
  const finishedSteps = rows.filter((goal) => goal.parent_id && goal.completed_at).length;
  const toward =
    viewer.character && showsLevelFourProgress(viewer.character.level)
      ? levelFourProgress(finishedSteps, viewer.config?.level_four_steps_required ?? LEVEL_FOUR_STEPS_DEFAULT)
      : null;
  const views: GoalView[] = rows.map((goal) => ({
    id: goal.id,
    title: goal.title,
    category: goal.category,
    categoryLabel: CATEGORIES.find(([value]) => value === goal.category)?.[1] ?? goal.category,
    description: goal.description,
    active: goal.is_active,
    longTerm: goal.is_long_term,
    parentId: goal.parent_id,
    createdAt: goal.created_at ?? "",
    completed: Boolean(goal.completed_at),
    markedDone: Boolean(goal.marked_done),
    periodLabel: goal.period_start ? `${goal.period_start} to ${goal.period_end ?? ""}` : null,
    chips: [
      goal.cmart_clear ? "C" : "",
      goal.cmart_measurable ? "M" : "",
      goal.cmart_attainable ? "A" : "",
      goal.cmart_relevant ? "R" : "",
      goal.cmart_timed ? "T" : "",
    ].filter(Boolean),
  }));
  const rewardViews: RewardView[] = ((rewards ?? []) as {
    id: string;
    goal_id: string;
    status: string;
    buff_id: string | null;
    buff_other: string | null;
    story_reward: string | null;
  }[]).map((reward) => ({
    id: reward.id,
    goalId: reward.goal_id,
    status: reward.status,
    buffName: reward.buff_other || buffs.find((buff) => buff.id === reward.buff_id)?.name || null,
    story: reward.story_reward,
  }));

  return (
    <Page
      title="Goals"
      lede="Nutrition and sleep feed Constitution. Mental goals feed Intelligence or Wisdom. Social goals feed Charisma."
      mark={false}
    >
      {setup ? <Notice>{setup}</Notice> : null}
      <GoalsBoard
        signedIn={Boolean(viewer.userId)}
        hasCharacter={Boolean(viewer.character)}
        level={viewer.character?.level ?? null}
        today={viewer.today}
        cmartOn={cmartRequired(viewer.config?.mental_goal_cmart)}
        conChoice={viewer.character?.constitution_goal_id ?? null}
        conStatus={conStatus}
        towardLabel={toward?.label ?? null}
        goals={views}
        rewards={rewardViews}
        canRecord={isLogApprover(viewer.role)}
        buffs={buffs}
      />
    </Page>
  );
}
