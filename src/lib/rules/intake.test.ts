import { describe, expect, it } from "vitest";
import { beginnerHints, intakeError } from "./intake";

const ready = {
  dnd: "never",
  gym: "new",
  goals: ["Sleep 7 hours"],
  timeslot: "morning",
};

describe("player intake", () => {
  it("requires experience, one goal, and a time, and nothing medical", () => {
    expect(intakeError(ready)).toBeNull();
    expect(intakeError({ ...ready, dnd: "" })).toMatch(/played/);
    expect(intakeError({ ...ready, gym: "injured" })).toMatch(/gym/);
    expect(intakeError({ ...ready, goals: [] })).toMatch(/goal/);
    expect(intakeError({ ...ready, timeslot: "" })).toMatch(/time/);
    expect(Object.keys(ready)).toEqual(["dnd", "gym", "goals", "timeslot"]);
  });

  it("turns beginner hints on for a first-timer", () => {
    expect(beginnerHints({ dnd: "never", gym: "regular" })).toBe(true);
    expect(beginnerHints({ dnd: "lots", gym: "new" })).toBe(true);
    expect(beginnerHints({ dnd: "lots", gym: "regular" })).toBe(false);
    expect(beginnerHints(null)).toBe(false);
  });
});