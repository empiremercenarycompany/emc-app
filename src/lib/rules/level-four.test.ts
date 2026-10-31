import { describe, expect, it } from "vitest";
import {
  GOAL_REWARD_BUFF_SEED,
  GOAL_REWARD_READY,
  LEVEL_FOUR_STEPS_DEFAULT,
  levelFourProgress,
  showsLevelFourProgress,
  showsMilestoneLevels,
} from "./level-four";

describe("level 4 steps", () => {
  it("defaults to four completed short-term goals and stays configurable", () => {
    expect(LEVEL_FOUR_STEPS_DEFAULT).toBe(4);
    expect(levelFourProgress(2, null).label).toBe("2 of 4");
    expect(levelFourProgress(2, 4)).toEqual({ completed: 2, required: 4, label: "2 of 4" });
    expect(levelFourProgress(1, 6).label).toBe("1 of 6");
    expect(GOAL_REWARD_READY).toBe("Goal reward ready: see your DM");
    expect(GOAL_REWARD_BUFF_SEED.map((row) => row.name)).toEqual([
      "Heroic Inspiration",
      "Advantage on one check",
    ]);
  });

  it("shows the fraction from level 3 and keeps milestones through level 3", () => {
    expect(showsLevelFourProgress(2)).toBe(false);
    expect(showsLevelFourProgress(3)).toBe(true);
    expect(showsMilestoneLevels(1)).toBe(true);
    expect(showsMilestoneLevels(3)).toBe(true);
    expect(showsMilestoneLevels(4)).toBe(false);
  });
});
