"use client";

import { useState } from "react";
import { ResultForm } from "@/components/result-form";
import { recordGoalReward } from "@/lib/actions/activity";

export function GoalRewardForm({
  rewardId,
  buffs,
}: {
  rewardId: string;
  buffs: { id: string; name: string }[];
}) {
  const [other, setOther] = useState(false);
  return (
    <ResultForm action={recordGoalReward} submit="Record the reward">
      <input type="hidden" name="reward_id" value={rewardId} />
      <label>
        Buff
        <select
          name="buff_id"
          required
          defaultValue=""
          onChange={(event) => setOther(event.target.value === "other")}
        >
          <option value="" disabled>
            Choose a buff
          </option>
          {buffs.map((buff) => (
            <option key={buff.id} value={buff.id}>
              {buff.name}
            </option>
          ))}
          <option value="other">Other</option>
        </select>
      </label>
      {other ? (
        <label>
          Other buff
          <input name="buff_other" required />
        </label>
      ) : null}
      <label>
        Story reward
        <textarea name="story_reward" required />
      </label>
    </ResultForm>
  );
}
