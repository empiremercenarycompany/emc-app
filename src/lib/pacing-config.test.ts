import { describe, expect, it } from "vitest";
import { allowanceFor, paceTarget, CATCHUP_PER_POOL_CAP, CATCHUP_WEEKLY_CAP, PER_POOL_WEEKLY_CAP, WEEKLY_CAP } from "./pacing-config";
import { cappedAward } from "./rules/awards";

describe("pace line", () => {
  it("uses the floor and starts catch-up at week 8", () => {
    expect(paceTarget(7)).toBe(11);
    expect(paceTarget(8)).toBe(13);
    expect(paceTarget(9)).toBe(15);
    expect(paceTarget(16)).toBe(27);

    expect(allowanceFor(7, 0)).toMatchObject({ behind: false, weeklyCap: WEEKLY_CAP, poolCap: PER_POOL_WEEKLY_CAP });
    expect(allowanceFor(7, 11)).toMatchObject({ behind: false, weeklyCap: WEEKLY_CAP });

    expect(allowanceFor(8, 12).behind).toBe(true);
    expect(allowanceFor(8, 12)).toMatchObject({ weeklyCap: CATCHUP_WEEKLY_CAP, poolCap: CATCHUP_PER_POOL_CAP });
    expect(allowanceFor(8, 13)).toMatchObject({ behind: false, weeklyCap: WEEKLY_CAP, poolCap: PER_POOL_WEEKLY_CAP });

    expect(allowanceFor(16, 26).behind).toBe(true);
    expect(allowanceFor(16, 27).behind).toBe(false);
    expect(allowanceFor(null, 0).behind).toBe(false);
  });

  it("caps a new award and leaves an attendance grant outside the week", () => {
    const onPace = allowanceFor(7, 0);
    expect(
      cappedAward({
        unit: 1,
        weekEarned: 1,
        poolEarned: 1,
        awardedTotal: 10,
        weeklyCap: onPace.weeklyCap,
        poolCap: onPace.poolCap,
        budget: 27,
        exemptFromCaps: false,
      }),
    ).toBe(0);
    expect(
      cappedAward({
        unit: 1,
        weekEarned: 2,
        poolEarned: 0,
        awardedTotal: 10,
        weeklyCap: onPace.weeklyCap,
        poolCap: onPace.poolCap,
        budget: 27,
        exemptFromCaps: false,
      }),
    ).toBe(0);
    const behind = allowanceFor(8, 12);
    expect(
      cappedAward({
        unit: 1,
        weekEarned: 2,
        poolEarned: 1,
        awardedTotal: 12,
        weeklyCap: behind.weeklyCap,
        poolCap: behind.poolCap,
        budget: 27,
        exemptFromCaps: false,
      }),
    ).toBe(1);
    expect(
      cappedAward({
        unit: 1,
        weekEarned: 2,
        poolEarned: 0,
        awardedTotal: 26,
        weeklyCap: behind.weeklyCap,
        poolCap: behind.poolCap,
        budget: 27,
        exemptFromCaps: true,
      }),
    ).toBe(1);
  });
});
