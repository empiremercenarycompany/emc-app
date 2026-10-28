import { describe, expect, it } from "vitest";
import { utcDate, calendarDate, calendarDaysBetween } from "./dates";
import { pointBuyCost, POINT_BUY_COSTS } from "./point-buy";
import { isValidStartingArray, scoresFromBonuses, type AbilityScores } from "./starting-array";
import { checkSpend, poolOf, stepScore, type PoolBalances } from "./pools";
import { defaultProgressionConfig } from "./config";
import {
  inFirstAdventure,
  pointsForGoal,
  pointsForWorkout,
  poolForGoalCategory,
  sessionFor,
  sessionIndex,
  type CohortSession,
} from "./progression";
import { parseDice, rollDice } from "./dice";
import { publishBlockReason } from "./library";
import { abilityModifier } from "./modifiers";
import { affordableIncreases, buildTotal } from "./impact";

const anchor = utcDate(2026, 10, 5);
const today = utcDate(2026, 10, 25);
const build = 3;

const baseScores: AbilityScores = {
  strength: 8,
  dexterity: 8,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
};

function workout(input: {
  logId?: string;
  awarded?: string[];
  already?: number;
  total?: number;
  logDate: Date;
  on?: Date;
  cohort?: Date;
  schedule?: CohortSession[];
  custom?: boolean;
}): number {
  return pointsForWorkout({
    logId: input.logId ?? "log",
    alreadyAwardedLogIds: new Set(input.awarded ?? []),
    exercisePointsAlreadyInSession: input.already ?? 0,
    buildTotal: input.total ?? build,
    logDate: input.logDate,
    today: input.on ?? today,
    anchor: input.cohort ?? anchor,
    schedule: input.schedule,
    custom: input.custom,
  });
}

describe("point buy and the starting array", () => {
  it("uses the 5.5e cost table", () => {
    expect(POINT_BUY_COSTS).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
    expect(pointBuyCost(16)).toBeNull();
    expect(pointBuyCost(14)! - pointBuyCost(13)!).toBe(2);
  });

  it("accepts +2/+1 and three +1s on any abilities", () => {
    expect(isValidStartingArray(scoresFromBonuses("plus2", ["strength", "dexterity"]))).toBe(true);
    expect(isValidStartingArray(scoresFromBonuses("plus2", ["charisma", "wisdom"]))).toBe(true);
    expect(
      isValidStartingArray(scoresFromBonuses("plus1", ["intelligence", "wisdom", "charisma"])),
    ).toBe(true);
    expect(isValidStartingArray(baseScores)).toBe(false);
    expect(isValidStartingArray({ ...baseScores, strength: 12 })).toBe(false);
    expect(isValidStartingArray({ ...baseScores, strength: 10, dexterity: 10 })).toBe(false);
    expect(buildTotal(scoresFromBonuses("plus2", ["strength", "constitution"]), {
      physical: 0,
      constitution: 0,
      mental: 0,
      social: 0,
      free: 0,
    })).toBe(3);
  });
});

describe("attribute pools", () => {
  const empty: PoolBalances = { physical: 0, constitution: 0, mental: 0, social: 0, free: 0 };

  it("maps each ability to its source pool", () => {
    expect(poolOf("strength")).toBe("physical");
    expect(poolOf("dexterity")).toBe("physical");
    expect(poolOf("constitution")).toBe("constitution");
    expect(poolOf("intelligence")).toBe("mental");
    expect(poolOf("wisdom")).toBe("mental");
    expect(poolOf("charisma")).toBe("social");
  });

  it("refunds a Physical purchase to Physical", () => {
    const up = stepScore({
      scores: baseScores,
      pools: { physical: 2, constitution: 0, mental: 0, social: 0, free: 0 },
      ability: "strength",
      delta: 1,
    });
    expect(up?.scores.strength).toBe(9);
    expect(up?.pools.physical).toBe(1);
    expect(up?.costDelta).toBe(1);
    const back = stepScore({
      scores: up!.scores,
      pools: up!.pools,
      ability: "strength",
      delta: -1,
    });
    expect(back?.pools).toEqual({ physical: 2, constitution: 0, mental: 0, social: 0, free: 0 });
  });

  it("refuses to spend one pool on another ability", () => {
    const pools = { physical: 9, constitution: 0, mental: 0, social: 0, free: 0 };
    expect(stepScore({ scores: baseScores, pools, ability: "constitution", delta: 1 })).toBeNull();
    expect(stepScore({ scores: baseScores, pools, ability: "wisdom", delta: 1 })).toBeNull();
    const check = checkSpend({
      from: baseScores,
      to: { ...baseScores, constitution: 9 },
      pools,
    });
    expect(check.ok).toBe(false);
  });

  it("nets a full save inside each pool and rejects scores off the table", () => {
    const from: AbilityScores = { ...baseScores, strength: 10, dexterity: 9 };
    const to: AbilityScores = { ...from, strength: 8, dexterity: 10 };
    const check = checkSpend({ from, to, pools: empty });
    expect(check.ok && check.poolsAfter.physical).toBe(1);

    const high = checkSpend({
      from: baseScores,
      to: { ...baseScores, strength: 16 },
      pools: { physical: 30, constitution: 0, mental: 0, social: 0, free: 0 },
    });
    expect(high.ok).toBe(false);
  });

  it("draws Strength and Dexterity from the same Physical balance", () => {
    const to: AbilityScores = { ...baseScores, strength: 10, dexterity: 9 };
    const exact = checkSpend({
      from: baseScores,
      to,
      pools: { physical: 3, constitution: 0, mental: 0, social: 0, free: 0 },
    });
    expect(exact.ok && exact.poolsAfter.physical).toBe(0);
    const short = checkSpend({
      from: baseScores,
      to,
      pools: { physical: 2, constitution: 0, mental: 0, social: 0, free: 0 },
    });
    expect(short.ok).toBe(false);
  });

  it("lists the increases the current pools can buy", () => {
    expect(affordableIncreases(baseScores, { physical: 1, constitution: 0, mental: 2, social: 0, free: 1 })).toEqual([
      { ability: "strength", from: 8, to: 9, cost: 1, pool: "physical" },
      { ability: "dexterity", from: 8, to: 9, cost: 1, pool: "physical" },
      { ability: "constitution", from: 8, to: 9, cost: 1, pool: "free" },
      { ability: "intelligence", from: 8, to: 9, cost: 1, pool: "mental" },
      { ability: "wisdom", from: 8, to: 9, cost: 1, pool: "mental" },
      { ability: "charisma", from: 8, to: 9, cost: 1, pool: "free" },
    ]);
  });
});

describe("first-adventure awards", () => {
  it("keeps John's numbers in the default config", () => {
    expect(defaultProgressionConfig.timeZone).toBe("America/Boise");
    expect(defaultProgressionConfig.cohortStart).toEqual(utcDate(2027, 1, 2));
    expect(defaultProgressionConfig.backfillDays).toBe(14);
    expect(defaultProgressionConfig.pointsPerWorkout).toBe(1);
    expect(defaultProgressionConfig.pointsPerGoal).toBe(1);
    expect(defaultProgressionConfig.weeklyPointCap).toBe(4);
    expect(defaultProgressionConfig.poolPointCap).toBe(2);
    expect(defaultProgressionConfig.attendancePoints).toBe(2);
    expect(defaultProgressionConfig.awardRequiresApproval).toBe(true);
    expect(defaultProgressionConfig.logVisibility).toBe("company");
    expect(defaultProgressionConfig.pointBuyBudget).toBe(27);
    expect(defaultProgressionConfig.squadMaxSize).toBe(6);
    expect(defaultProgressionConfig.weeklyPointCap * defaultProgressionConfig.paceFullWeek).toBe(24);
  });

  it("pays Constitution or Mental from the goal category", () => {
    expect(poolForGoalCategory("constitution")).toBe("constitution");
    expect(poolForGoalCategory("nutrition")).toBe("constitution");
    expect(poolForGoalCategory("sleep")).toBe("constitution");
    expect(poolForGoalCategory("intelligence")).toBe("mental");
    expect(poolForGoalCategory("wisdom")).toBe("mental");
    expect(poolForGoalCategory("charisma")).toBe("social");
  });

  it("uses 14 Denver dates and stops automatic awards after session 8", () => {
    const session8Start = utcDate(2026, 10, 5 + 7 * 14);
    const session8End = utcDate(2026, 10, 5 + 7 * 14 + 13);
    const after = utcDate(2026, 10, 5 + 8 * 14);
    expect(sessionIndex(utcDate(2026, 10, 4), { anchor })).toBeNull();
    expect(sessionIndex(anchor, { anchor })).toBe(1);
    expect(sessionIndex(utcDate(2026, 10, 18), { anchor })).toBe(1);
    expect(sessionFor(utcDate(2026, 10, 18), { anchor })?.end).toEqual(utcDate(2026, 10, 18));
    expect(sessionIndex(utcDate(2026, 10, 19), { anchor })).toBe(2);
    expect(inFirstAdventure(utcDate(2026, 11, 29), { anchor })).toBe(true);
    expect(sessionIndex(session8End, { anchor })).toBe(8);
    expect(inFirstAdventure(session8End, { anchor })).toBe(true);
    expect(sessionIndex(after, { anchor })).toBe(9);
    expect(inFirstAdventure(after, { anchor })).toBe(false);
    expect(session8Start).toEqual(utcDate(2027, 1, 11));
  });

  it("chooses the Denver calendar date, including the DST edges", () => {
    expect(calendarDate(new Date("2026-10-26T05:30:00Z"), "America/Denver")).toEqual(utcDate(2026, 10, 25));
    expect(calendarDate(new Date("2026-10-26T06:00:00Z"), "America/Denver")).toEqual(utcDate(2026, 10, 26));
    expect(calendarDate(new Date("2026-10-26T05:30:00Z"), "America/New_York")).toEqual(utcDate(2026, 10, 26));
    expect(calendarDate(new Date("2026-03-08T08:30:00Z"), "America/Denver")).toEqual(utcDate(2026, 3, 8));
    expect(calendarDate(new Date("2026-03-08T09:30:00Z"), "America/Denver")).toEqual(utcDate(2026, 3, 8));
    expect(calendarDate(new Date("2026-11-01T07:30:00Z"), "America/Denver")).toEqual(utcDate(2026, 11, 1));
    expect(calendarDate(new Date("2026-11-01T08:30:00Z"), "America/Denver")).toEqual(utcDate(2026, 11, 1));
    expect(calendarDate(new Date("2026-01-01T06:30:00Z"), "America/Denver")).toEqual(utcDate(2025, 12, 31));
    expect(calendarDate(new Date("2026-01-01T07:00:00Z"), "America/Denver")).toEqual(utcDate(2026, 1, 1));
  });

  it("caps a session at 3 exercise points and counts a late log in its own session", () => {
    expect(workout({ logId: "a", logDate: today })).toBe(1);
    expect(workout({ logId: "b", awarded: ["a"], already: 1, logDate: today })).toBe(1);
    expect(workout({ logId: "c", already: 2, logDate: today })).toBe(0);
    expect(workout({ logId: "d", already: 3, logDate: today })).toBe(0);
    const late = utcDate(2026, 10, 11);
    expect(calendarDaysBetween(late, today)).toBe(14);
    expect(sessionIndex(late, { anchor })).toBe(1);
    expect(sessionIndex(today, { anchor })).toBe(2);
    expect(workout({ logId: "late", already: 0, logDate: late })).toBe(1);
    expect(workout({ logDate: utcDate(2026, 10, 11) })).toBe(1);
    expect(workout({ logDate: utcDate(2026, 10, 10) })).toBe(0);
  });

  it("stops at the 27-point build, rejects the future, and ignores a replay", () => {
    const after = utcDate(2026, 10, 5 + 8 * 14);
    expect(workout({ logDate: utcDate(2026, 10, 4), on: utcDate(2026, 10, 5) })).toBe(0);
    expect(workout({ logDate: after, on: after })).toBe(1);
    expect(workout({ logDate: today, total: 27 })).toBe(0);
    expect(workout({ logDate: today, total: 26 })).toBe(1);
    expect(() => workout({ logDate: utcDate(2026, 10, 26) })).toThrow(/Future/);
    expect(workout({ logId: "a", awarded: ["a"], logDate: today })).toBe(0);
  });

  it("gives goals their own cap and the same backfill window", () => {
    const goal = (overrides: Partial<Parameters<typeof pointsForGoal>[0]> = {}) =>
      pointsForGoal({
        goalId: "g1",
        alreadyAwardedGoalIds: new Set(),
        goalPointsAlreadyInSession: 0,
        buildTotal: build,
        completedOn: today,
        today,
        anchor,
        ...overrides,
      });
    expect(goal()).toBe(1);
    expect(goal({ goalId: "g4", goalPointsAlreadyInSession: 2 })).toBe(0);
    expect(goal({ alreadyAwardedGoalIds: new Set(["g1"]) })).toBe(0);
    expect(goal({ completedOn: utcDate(2026, 10, 10) })).toBe(0);
    expect(goal({ completedOn: utcDate(2026, 10, 11), goalPointsAlreadyInSession: 1 })).toBe(1);
  });

  it("lets a published schedule replace the cadence", () => {
    const threeParter = utcDate(2026, 10, 25);
    const offWeek = utcDate(2026, 10, 26);
    const next = utcDate(2026, 11, 2);
    const schedule: CohortSession[] = [
      { number: 1, start: anchor, end: threeParter },
      { number: 2, start: next, end: utcDate(2026, 11, 15) },
    ];
    expect(sessionIndex(threeParter, { schedule })).toBe(1);
    expect(sessionIndex(offWeek, { schedule })).toBeNull();
    expect(inFirstAdventure(offWeek, { schedule })).toBe(false);
    expect(sessionIndex(next, { schedule })).toBe(2);
    expect(workout({ logDate: threeParter, on: threeParter, schedule })).toBe(1);
    expect(workout({ logDate: offWeek, on: next, schedule })).toBe(1);
    expect(pointsForGoal({
      goalId: "off-week",
      alreadyAwardedGoalIds: new Set(),
      goalPointsAlreadyInSession: 0,
      buildTotal: build,
      completedOn: offWeek,
      today: next,
      anchor,
      schedule,
    })).toBe(1);
    expect(sessionIndex(threeParter, { anchor })).toBe(2);
    expect(sessionIndex(anchor, { schedule: [{ number: 9, start: anchor, end: utcDate(2026, 10, 18) }] })).toBe(9);
    expect(inFirstAdventure(anchor, { schedule: [{ number: 9, start: anchor, end: utcDate(2026, 10, 18) }] })).toBe(false);
  });

  it("rejects an overlapping or backwards schedule", () => {
    expect(() =>
      sessionFor(anchor, {
        schedule: [
          { number: 1, start: anchor, end: utcDate(2026, 10, 20) },
          { number: 2, start: utcDate(2026, 10, 20), end: utcDate(2026, 11, 2) },
        ],
      }),
    ).toThrow(/overlap/);
    expect(() =>
      sessionFor(anchor, {
        schedule: [{ number: 1, start: utcDate(2026, 10, 20), end: anchor }],
      }),
    ).toThrow(/before/);
  });
});

describe("dice, modifiers, and the STR template", () => {
  it("parses NdX+M and keeps advantage or disadvantage", () => {
    expect(parseDice("2d6+3")).toEqual({ count: 2, sides: 6, modifier: 3 });
    expect(parseDice("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDice("1d20-1")).toEqual({ count: 1, sides: 20, modifier: -1 });
    expect(parseDice("nope")).toBeNull();

    let n = 0;
    const rolls = [0, 0.99];
    const result = rollDice("1d20+2", {
      advantage: true,
      rng: () => rolls[n++] ?? 0,
    });
    expect(result.mode).toBe("advantage");
    expect(result.total).toBe(20 + 2);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(15)).toBe(2);
  });

  it("blocks a STR workout that is missing a movement or a version", () => {
    expect(
      publishBlockReason({
        attribute: "str",
        components: ["overhead_press", "carry", "horizontal_push", "horizontal_pull"],
        equipment: ["functional", "full_gym", "at_home"],
      }),
    ).toMatch(/Leg/);
    expect(
      publishBlockReason({
        attribute: "dex",
        components: [],
        equipment: ["functional", "at_home"],
      }),
    ).toMatch(/version/);
    expect(
      publishBlockReason({
        attribute: "str",
        components: ["overhead_press", "carry", "horizontal_push", "horizontal_pull", "leg"],
        equipment: ["functional", "full_gym", "at_home"],
      }),
    ).toBeNull();
  });
});
