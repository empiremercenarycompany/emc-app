import { redirect } from "next/navigation";
import { ResultForm } from "@/components/result-form";
import { Notice, Page, Panel } from "@/components/ui";
import { GoalRewardForm } from "@/components/goal-reward-form";
import { finalizeStats } from "@/lib/actions/muster";
import { GOAL_REWARD_BUFF_SEED } from "@/lib/rules/level-four";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { isLogApprover } from "@/lib/types";

const ABILITY: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const BANK: Record<string, string> = {
  physical: "workouts",
  constitution: "nutrition and sleep",
  mental: "mental goals",
  social: "social goals",
  free: "attendance",
};

export default async function TrainerPage() {
  const viewer = await loadViewer();
  if (!viewer.userId) redirect("/sign-in");
  if (!isLogApprover(viewer.role)) redirect("/");
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const trainer = isLogApprover(viewer.role);
  const people =
    supabase && viewer.guildId && trainer
      ? (await supabase.from("characters").select("id, name").eq("guild_id", viewer.guildId).order("name")).data
      : [];
  const waitingRewards =
    supabase && trainer
      ? (
          await supabase
            .from("goal_rewards")
            .select("id, status, goal_id, character_id, goals(title), characters(name)")
            .eq("status", "ready")
        ).data
      : [];
  const buffRows = supabase ? (await supabase.from("goal_reward_buffs").select("id, name").eq("enabled", true).order("sort_order")).data : null;
  const buffs = (buffRows && buffRows.length > 0 ? buffRows : [...GOAL_REWARD_BUFF_SEED]).map((row) => ({
    id: row.id,
    name: row.name,
  }));
  const waiting =
    supabase && trainer
      ? (
          await supabase
            .from("build_placements")
            .select("character_id, ability, pool, remaining")
            .eq("status", "provisional")
            .gt("remaining", 0)
        ).data
      : [];

  return (
    <Page title="Trainer" lede="In person at the gym. Read the change, then finalize one recruit.">
      {setup ? <Notice>{setup}</Notice> : null}
      <Panel title="Waiting">
        <p>Not final yet: see your DM or trainer to lock these in.</p>
        {trainer ? (
          <>
            {(people ?? []).filter((person) => (waiting ?? []).some((row) => row.character_id === person.id)).length === 0 ? (
              <p className="text-mute">Nothing is waiting.</p>
            ) : null}
            {(people ?? []).map((person) => {
              const lines = (waiting ?? []).filter((row) => row.character_id === person.id);
              if (lines.length === 0) return null;
              return (
                <div key={person.id}>
                  <p>{person.name}</p>
                  {lines.map((line) => (
                    <p key={`${person.id}-${line.ability}-${line.pool}`}>
                      {ABILITY[line.ability] ?? line.ability} · {line.remaining} · {BANK[line.pool] ?? line.pool}
                    </p>
                  ))}
                </div>
              );
            })}
            <ResultForm action={finalizeStats} submit="Finalize stats" primary>
              <label>
                Recruit
                <select name="character_id" required defaultValue="">
                  <option value="" disabled>
                    Choose a recruit
                  </option>
                  {(people ?? []).map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            </ResultForm>
          </>
        ) : null}
      </Panel>
      <Panel title="Goal rewards">
        <p>When a recruit finishes a short-term step, record the buff and the story. Nothing is granted from this screen.</p>
        {(waitingRewards ?? []).length === 0 ? <p className="text-mute">Nothing is waiting.</p> : null}
        {(waitingRewards ?? []).map((reward) => {
          const goal = Array.isArray(reward.goals) ? reward.goals[0] : reward.goals;
          const person = Array.isArray(reward.characters) ? reward.characters[0] : reward.characters;
          return (
            <div key={reward.id}>
              <p>
                {person?.name ?? "Recruit"} · {goal?.title ?? "Step"}
              </p>
              <GoalRewardForm rewardId={reward.id} buffs={buffs} />
            </div>
          );
        })}
      </Panel>
    </Page>
  );
}
