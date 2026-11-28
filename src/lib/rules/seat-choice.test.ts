import { describe, expect, it } from "vitest";
import {
  canonicalSlotKey,
  chooseSaturdaySeat,
  firstFullCopy,
  GOT_IT,
  LOCK_IN_BUTTON,
  soldSlotKey,
  slotOversold,
  WAIT_FOR_FIRST,
  WAITLIST_COPY,
} from "./seat-choice";

describe("Saturday first and second choice", () => {
  it("pays for the first time when it is open", () => {
    expect(chooseSaturdaySeat({ firstOpen: 2, secondOpen: 0 })).toBe("first");
    expect(chooseSaturdaySeat({ firstOpen: 1, secondOpen: null })).toBe("first");
  });

  it("offers the second time when only that one is open", () => {
    expect(chooseSaturdaySeat({ firstOpen: 0, secondOpen: 3 })).toBe("second");
  });

  it("waitlists when neither time has room", () => {
    expect(chooseSaturdaySeat({ firstOpen: 0, secondOpen: 0 })).toBe("waitlist");
    expect(chooseSaturdaySeat({ firstOpen: 0, secondOpen: null })).toBe("waitlist");
    expect(WAITLIST_COPY).toBe(
      "Both times you picked are full right now. You're on the waitlist, and you won't pay anything until a seat opens. We'll email you as soon as one does, at today's rate.",
    );
    expect(GOT_IT).toBe("Got it");
  });

  it("needs two seats when a friend is coming", () => {
    expect(chooseSaturdaySeat({ firstOpen: 1, secondOpen: 2, withFriend: true })).toBe("second");
    expect(chooseSaturdaySeat({ firstOpen: 1, secondOpen: 1, withFriend: true })).toBe("waitlist");
  });

  it("keeps a payment that landed after the seat filled", () => {
    expect(slotOversold(0)).toBe(false);
    expect(slotOversold(-1)).toBe(true);
  });

  it("uses the second-choice sentence and the lock-in button", () => {
    expect(firstFullCopy("Saturday afternoons, 2 PM to 5 PM, first game Jan 2, 2027")).toBe(
      "Your first choice is full, but your second choice has a seat: Saturday afternoons, 2 PM to 5 PM, first game Jan 2, 2027. Pay to lock it in.",
    );
    expect(LOCK_IN_BUTTON).toBe("Lock in my seat");
    expect(WAIT_FOR_FIRST).toBe("I'd rather wait for my first choice");
  });

  it("names the sold table without a bare clock time", () => {
    expect(canonicalSlotKey("daytime:2027-01-02")).toBe("afternoon:2027-01-02");
    expect(canonicalSlotKey("morning")).toBeNull();
    expect(
      soldSlotKey({
        preferred_slot: "morning:2027-01-02",
        preferred_slot_2: "evening:2027-01-09",
        checkout_slot: "second",
      }),
    ).toBe("evening:2027-01-09");
  });
});
