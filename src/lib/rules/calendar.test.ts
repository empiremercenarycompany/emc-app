import { describe, expect, it } from "vitest";
import { utcDate } from "./dates";
import { calendarBlocks, companyWeekNumber, milestoneAdvance, nextSessionBlock, sampleCalendar } from "./calendar";

describe("company calendar", () => {
  const anchor = utcDate(2027, 1, 4);

  it("counts Denver weeks from the cohort anchor", () => {
    expect(companyWeekNumber(utcDate(2027, 1, 3), anchor)).toBeNull();
    expect(companyWeekNumber(anchor, anchor)).toBe(1);
    expect(companyWeekNumber(utcDate(2027, 2, 8), anchor)).toBe(6);
    expect(companyWeekNumber(utcDate(2027, 4, 19), anchor)).toBe(16);
    expect(companyWeekNumber(utcDate(2027, 8, 10), anchor)).toBe(32);
  });

  it("uses the cadence when no windows are published", () => {
    const blocks = calendarBlocks({
      anchor,
      throughWeek: 4,
      sessionLengthDays: 14,
      schedule: [],
      inductionWeek: 6,
      levelTwoWeek: 16,
      levelThreeWeek: 32,
    });
    expect(blocks.every((block) => block.kind === "session")).toBe(true);
    expect(blocks.map((block) => block.sessionNumber)).toEqual([1, 2]);
    expect(blocks[0]).toMatchObject({ start: "2027-01-04", end: "2027-01-17" });
  });

  it("marks a long row as a three-parter and a gap as an off-week", () => {
    const blocks = sampleCalendar();
    expect(blocks.some((block) => block.kind === "three-parter" && block.sessionNumber === 1)).toBe(true);
    expect(blocks.some((block) => block.kind === "off-week" && block.sessionNumber === null)).toBe(true);
    const gap = blocks.find((block) => block.kind === "off-week");
    expect(gap).toMatchObject({ start: "2027-02-01", end: "2027-02-14" });
  });

  it("chooses the session that contains today, or the next one after an off-week", () => {
    const blocks = sampleCalendar();
    expect(nextSessionBlock(blocks, "2027-01-31")).toMatchObject({
      when: "now",
      block: { sessionNumber: 1, kind: "three-parter" },
    });
    expect(nextSessionBlock(blocks, "2027-02-10")).toMatchObject({
      when: "next",
      block: { sessionNumber: 2, start: "2027-02-15" },
    });
    expect(nextSessionBlock(blocks, "2026-12-01")?.block.sessionNumber).toBe(1);
    expect(nextSessionBlock(blocks, null)?.when).toBe("next");
    expect(nextSessionBlock(blocks, "2027-03-01")).toBeNull();
  });

  it("opens milestones one step at a time and never lowers a level", () => {
    const gate = { levelTwoWeek: 16, levelThreeWeek: 32, levelTwo: 2, levelThree: 3 };
    expect(milestoneAdvance({ level: 1, week: 6, ...gate })).toBeNull();
    expect(milestoneAdvance({ level: 1, week: 16, ...gate })).toBe(2);
    expect(milestoneAdvance({ level: 1, week: 32, ...gate })).toBe(2);
    expect(milestoneAdvance({ level: 2, week: 32, ...gate })).toBe(3);
    expect(milestoneAdvance({ level: 3, week: 40, ...gate })).toBeNull();
    expect(milestoneAdvance({ level: 1, week: null, ...gate })).toBeNull();
  });
});
