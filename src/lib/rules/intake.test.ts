import { describe, expect, it } from "vitest";
import { beginnerHints, displaySlot, intakeError } from "./intake";

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

  it("writes the session times with AM and PM", () => {
    expect(displaySlot("9–12", false)).toBe("9 AM–12 PM");
    expect(displaySlot("2–5", false)).toBe("2–5 PM");
    expect(displaySlot("7–10 PM", true)).toBe("7–10 PM (18+)");
    expect(displaySlot("9 AM–12 PM", false)).toBe("9 AM–12 PM");
  });

  it("turns beginner hints on for a first-timer", () => {
    expect(beginnerHints({ dnd: "never", gym: "regular" })).toBe(true);
    expect(beginnerHints({ dnd: "lots", gym: "new" })).toBe(true);
    expect(beginnerHints({ dnd: "lots", gym: "regular" })).toBe(false);
    expect(beginnerHints(null)).toBe(false);
  });
});