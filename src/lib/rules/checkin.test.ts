import { describe, expect, it } from "vitest";
import { checkinScore, complianceRatio, preInductionHp } from "./checkin";
import { deliverDiscord, formatCheckin, formatSaturdayTally, formatThursdayReminder } from "./discord";
import { cappedAward } from "./awards";

describe("weekly check-in", () => {
  it("scores 2, 1, or 0 and zeros a thin workout week", () => {
    expect(checkinScore({ workouts: 3, wis: true, int: true, cha: true })).toBe(2);
    expect(checkinScore({ workouts: 4, wis: true, int: true, cha: false })).toBe(1);
    expect(checkinScore({ workouts: 2, wis: true, int: true, cha: true })).toBe(1);
    expect(checkinScore({ workouts: 2, wis: false, int: true, cha: true })).toBe(0);
    expect(checkinScore({ workouts: 1, wis: true, int: true, cha: true })).toBe(0);
    expect(checkinScore({ workouts: 0, wis: true, int: true, cha: true })).toBe(0);
  });

  it("computes compliance from roster and weeks", () => {
    expect(complianceRatio(4, 2, 2)).toBe(0.5);
    expect(complianceRatio(0, 0, 3)).toBeNull();
  });
});

describe("pre-induction hit points", () => {
  it("uses 6 plus the Constitution modifier and the named bonuses", () => {
    expect(preInductionHp({ constitution: 10, species: "human", originWord: "Skilled" })).toBe(6);
    expect(preInductionHp({ constitution: 14, species: "human", originWord: "Skilled" })).toBe(8);
    expect(preInductionHp({ constitution: 8, species: "dwarf", originWord: "Tough" })).toBe(8);
  });
});

describe("discord formatters", () => {
  it("formats the three messages and does not send while disabled", () => {
    expect(formatCheckin({ name: "Mara", squad: "RBM", week: "2026-10-26", score: 2 })).toContain("Mara");
    expect(formatThursdayReminder({ week: "2026-10-26" })).toContain("Friday");
    expect(formatSaturdayTally({ squad: "CCC", earned: 3, possible: 4 })).toContain("CCC");
    expect(deliverDiscord(false)).toEqual({ sent: false, reason: "disabled" });
    expect(deliverDiscord(true).sent).toBe(false);
  });
});

describe("weekly attribute cap", () => {
  it("caps a week at 4 and a pool at 2, and leaves attendance outside the cap", () => {
    const base = { unit: 1, awardedTotal: 0, weeklyCap: 4, poolCap: 2, budget: 27 };
    expect(cappedAward({ ...base, weekEarned: 0, poolEarned: 0, exemptFromCaps: false })).toBe(1);
    expect(cappedAward({ ...base, weekEarned: 2, poolEarned: 2, exemptFromCaps: false })).toBe(0);
    expect(cappedAward({ ...base, weekEarned: 4, poolEarned: 0, exemptFromCaps: false })).toBe(0);
    expect(cappedAward({ ...base, weekEarned: 4, poolEarned: 2, exemptFromCaps: true, unit: 2 })).toBe(2);
    expect(cappedAward({ ...base, weekEarned: 0, poolEarned: 0, awardedTotal: 26, exemptFromCaps: true, unit: 2 })).toBe(1);
  });
});
