import { describe, expect, it } from "vitest";
import { compareGoalSteps } from "./goal-order";

describe("goal step order", () => {
  it("sorts by created time, then id", () => {
    const steps = [
      { id: "b", createdAt: "2026-10-02T00:00:00Z" },
      { id: "a", createdAt: "2026-10-02T00:00:00Z" },
      { id: "c", createdAt: "2026-10-01T00:00:00Z" },
    ];
    expect(steps.slice().sort(compareGoalSteps).map((step) => step.id)).toEqual(["c", "a", "b"]);
  });
});
