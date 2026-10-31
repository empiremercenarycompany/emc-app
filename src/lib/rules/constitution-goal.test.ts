import { describe, expect, it } from "vitest";
import {
  CON_GOAL_OPTIONS,
  CON_GOAL_SCORE_MIN_DEFAULT,
  CON_INITIATIVE_BONUS,
  constitutionBankReady,
  constitutionGoalCurrent,
  constitutionInitiative,
} from "./constitution-goal";

describe("constitution goal", () => {
  it("keeps the three named conditions", () => {
    expect(CON_GOAL_OPTIONS.map((option) => [option.label, option.condition])).toEqual([
      ["Get enough sleep", "Well Rested"],
      ["Meal prep", "Well Fed"],
      ["Do the cardio", "Limbered Up"],
    ]);
    expect(CON_INITIATIVE_BONUS).toBe(2);
    expect(CON_GOAL_SCORE_MIN_DEFAULT).toBe(15);
  });

  it("treats a maxed score with nothing left to place as ready", () => {
    expect(constitutionBankReady({ score: 15, unspent: 0, scoreMin: 15 })).toBe(true);
    expect(constitutionBankReady({ score: 15, unspent: 1, scoreMin: 15 })).toBe(false);
    expect(constitutionBankReady({ score: 14, unspent: 0, scoreMin: 15 })).toBe(false);
    expect(constitutionBankReady({ score: 16, unspent: 0, scoreMin: null })).toBe(true);
  });

  it("is current only for the chosen goal in this week", () => {
    expect(constitutionGoalCurrent({ choiceId: "sleep", markedWeek: "2026-10-26", weekStart: "2026-10-26" })).toBe(true);
    expect(constitutionGoalCurrent({ choiceId: "sleep", markedWeek: "2026-10-19", weekStart: "2026-10-26" })).toBe(false);
    expect(constitutionGoalCurrent({ choiceId: null, markedWeek: "2026-10-26", weekStart: "2026-10-26" })).toBe(false);
  });

  it("adds initiative only when the bank is ready and the week is current", () => {
    expect(
      constitutionInitiative({ dexModifier: -1, ready: true, current: true, condition: "Well Rested" }),
    ).toEqual({ total: 1, note: "Well Rested: +2 initiative" });
    expect(constitutionInitiative({ dexModifier: -1, ready: false, current: true, condition: "Well Rested" }).note).toBeNull();
    expect(constitutionInitiative({ dexModifier: -1, ready: true, current: false, condition: "Well Rested" }).total).toBe(-1);
  });
});
