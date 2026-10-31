import { describe, expect, it } from "vitest";
import { groupGoalDraft } from "./group-goal";

describe("group goal draft", () => {
  it("keeps the title and the chosen squad", () => {
    const data = new FormData();
    data.set("goal_title", "Keep the Scholar Breathing");
    data.set("goal_squad_id", "rbm-id");
    data.set("description", "Breathing room");
    data.set("objective_title", "Breaths");
    data.set("objective_target", "3");
    data.set("objective_unit", "sessions");
    expect(groupGoalDraft(data)).toEqual({
      title: "Keep the Scholar Breathing",
      squadId: "rbm-id",
      description: "Breathing room",
      objectiveTitle: "Breaths",
      target: "3",
      unit: "sessions",
    });
  });

  it("treats a blank squad as the whole company", () => {
    const data = new FormData();
    data.set("goal_title", "Company goal");
    data.set("goal_squad_id", "");
    expect(groupGoalDraft(data).squadId).toBeNull();
  });
});
