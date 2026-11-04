import { describe, expect, it } from "vitest";
import { duplicateGoalTitle, normalizeGoalTitle } from "./goal-title";

describe("duplicate goal titles", () => {
  const goals = [
    { id: "a", category: "charisma", title: "Talk to someone" },
    { id: "b", category: "intelligence", title: "Reading" },
  ];

  it("matches the same stat after spacing and case", () => {
    expect(normalizeGoalTitle("  Talk   to someone ")).toBe("talk to someone");
    expect(duplicateGoalTitle(goals, "charisma", "TALK TO SOMEONE")).toBe(true);
    expect(duplicateGoalTitle(goals, "wisdom", "Talk to someone")).toBe(false);
    expect(duplicateGoalTitle(goals, "charisma", "Talk to someone", "a")).toBe(false);
  });
});
