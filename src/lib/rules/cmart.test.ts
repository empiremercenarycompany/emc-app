import { describe, expect, it } from "vitest";
import { CMART_CHECKS, cmartComplete, cmartRequired, mentalGoalActive } from "./cmart";

describe("CMART mental goals", () => {
  it("names the five journal checks", () => {
    expect(CMART_CHECKS.map((check) => check.letter)).toEqual(["C", "M", "A", "R", "T"]);
    expect(CMART_CHECKS[4]?.prompt).toContain("An order without a deadline is a wish.");
  });

  it("stays on unless the config flag is false", () => {
    expect(cmartRequired(undefined)).toBe(true);
    expect(cmartRequired(true)).toBe(true);
    expect(cmartRequired(false)).toBe(false);
  });

  it("does not count a mental goal until every check is on", () => {
    const flags = { cmart_clear: true, cmart_measurable: true, cmart_attainable: true, cmart_relevant: true, cmart_timed: false };
    expect(cmartComplete(flags)).toBe(false);
    expect(mentalGoalActive({ category: "intelligence", required: true, flags })).toBe(false);
    expect(mentalGoalActive({ category: "wisdom", required: false, flags })).toBe(true);
    expect(
      mentalGoalActive({
        category: "charisma",
        required: true,
        flags,
      }),
    ).toBe(true);
    expect(mentalGoalActive({ category: "intelligence", required: true, flags: { ...flags, cmart_timed: true } })).toBe(true);
  });
});
