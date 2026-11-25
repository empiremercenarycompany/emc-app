import { describe, expect, it } from "vitest";
import { beginnerHints, displaySlot, enlistError, intakeError, slotsForAge, TIMESLOT_FALLBACK } from "./intake";

const ready = {
  dnd: "never",
  gym: "new",
  goals: ["Sleep 7 hours"],
  timeslot: "morning",
  age: "18_plus",
};

describe("player intake", () => {
  it("requires experience, one goal, and a time, and nothing medical", () => {
    expect(intakeError(ready)).toBeNull();
    expect(intakeError({ ...ready, dnd: "" })).toMatch(/played/);
    expect(intakeError({ ...ready, gym: "injured" })).toMatch(/gym/);
    expect(intakeError({ ...ready, goals: [] })).toMatch(/goal/);
    expect(intakeError({ ...ready, timeslot: "" })).toMatch(/Saturday table/);
    expect(intakeError({ ...ready, age: "" })).toMatch(/age/);
    expect(intakeError({ ...ready, age: "under_16", timeslot: "morning" })).toMatch(/waitlist/);
    expect(intakeError({ ...ready, age: "under_16", timeslot: "" })).toBeNull();
    expect(intakeError({ ...ready, age: "16_17", timeslot: "evening", adultsOnly: true })).toBeNull();
    expect(intakeError({ ...ready, age: "16_17", timeslot: "morning", adultsOnly: false })).toBeNull();
    expect(intakeError({ dnd: "never", gym: "new", goals: ["Sleep 7 hours"], timeslot: "" })).toMatch(/Saturday table/);
    expect(Object.keys(ready)).toEqual(["dnd", "gym", "goals", "timeslot", "age"]);
    expect(slotsForAge("18_plus", [...TIMESLOT_FALLBACK]).map((slot) => slot.id)).toEqual([
      "morning",
      "afternoon",
      "evening",
    ]);
    expect(slotsForAge("16_17", [...TIMESLOT_FALLBACK]).map((slot) => slot.id)).toEqual(["morning", "afternoon"]);
    expect(slotsForAge("", [...TIMESLOT_FALLBACK]).map((slot) => slot.id)).toEqual(["morning", "afternoon"]);
    expect(slotsForAge("under_16", [...TIMESLOT_FALLBACK])).toEqual([]);
  });

  it("writes the session times with AM and PM", () => {
    expect(displaySlot("9–12", false)).toBe("9 AM–12 PM");
    expect(displaySlot("2–5", false)).toBe("2–5 PM");
    expect(displaySlot("7–10 PM", true)).toBe("7–10 PM (18+)");
    expect(displaySlot("9 AM–12 PM", false)).toBe("9 AM–12 PM");
  });

  it("lets enlist details stay blank and rejects a bad phone", () => {
    const blank = { phone: "", species: "", classIdea: "", fitness: "", backstory: "" };
    expect(enlistError(blank)).toBeNull();
    expect(enlistError({ ...blank, phone: "208-555-0100" })).toBeNull();
    expect(enlistError({ ...blank, phone: "call me" })).toMatch(/phone/);
    expect(enlistError({ ...blank, species: "x".repeat(81) })).toMatch(/species/);
    expect(enlistError({ ...blank, classIdea: "x".repeat(81) })).toMatch(/class/);
    expect(enlistError({ ...blank, fitness: "x".repeat(601) })).toMatch(/fitness/);
    expect(enlistError({ ...blank, backstory: "x".repeat(2001) })).toMatch(/backstory/);
  });

  it("turns beginner hints on for a first-timer", () => {
    expect(beginnerHints({ dnd: "never", gym: "regular" })).toBe(true);
    expect(beginnerHints({ dnd: "lots", gym: "new" })).toBe(true);
    expect(beginnerHints({ dnd: "lots", gym: "regular" })).toBe(false);
    expect(beginnerHints(null)).toBe(false);
  });
});