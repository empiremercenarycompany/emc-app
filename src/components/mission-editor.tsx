"use client";

import { useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { ResultForm } from "@/components/result-form";
import { archiveMission, updateMission } from "@/lib/actions/staff";

export function MissionEditor({
  mission,
  squads,
}: {
  mission: {
    id: string;
    title: string;
    description: string | null;
    squadId: string | null;
    objectiveId: string | null;
    objectiveTitle: string;
    target: string;
    unit: string;
  };
  squads: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="secondary" type="button" onClick={() => setOpen(true)}>
        Edit
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ResultForm action={updateMission} submit="Save mission">
        <input type="hidden" name="mission_id" value={mission.id} />
        {mission.objectiveId ? <input type="hidden" name="objective_id" value={mission.objectiveId} /> : null}
        <label>
          Squad
          <select name="goal_squad_id" defaultValue={mission.squadId ?? ""}>
            <option value="">Whole company</option>
            {squads.map((squad) => (
              <option key={squad.id} value={squad.id}>
                {squad.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input name="goal_title" required defaultValue={mission.title} autoComplete="off" />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={mission.description ?? ""} />
        </label>
        <label>
          Objective
          <input name="objective_title" defaultValue={mission.objectiveTitle} autoComplete="off" />
        </label>
        <label>
          Target
          <input name="objective_target" defaultValue={mission.target} inputMode="numeric" autoComplete="off" />
        </label>
        <label>
          Unit
          <input name="objective_unit" defaultValue={mission.unit} autoComplete="off" />
        </label>
      </ResultForm>
      <ConfirmAction
        action={archiveMission}
        arm="Archive"
        confirm="Archive this mission"
        hidden={{ mission_id: mission.id }}
      />
      <button className="secondary" type="button" onClick={() => setOpen(false)}>
        Close
      </button>
    </div>
  );
}
