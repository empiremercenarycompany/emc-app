import { describe, expect, it } from "vitest";
import { canonicalSlotKey, chooseSaturdaySeat, soldSlotKey, slotOversold, WAITLIST_COPY } from "./seat-choice";

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
    expect(WAITLIST_COPY).toContain("won't pay anything until a seat opens");
  });

  it("needs two seats when a friend is coming", () => {
    expect(chooseSaturdaySeat({ firstOpen: 1, secondOpen: 2, withFriend: true })).toBe("second");
    expect(chooseSaturdaySeat({ firstOpen: 1, secondOpen: 1, withFriend: true })).toBe("waitlist");
  });

  it("keeps a payment that landed after the seat filled", () => {
    expect(slotOversold(0)).toBe(false);
    expect(slotOversold(-1)).toBe(true);
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
