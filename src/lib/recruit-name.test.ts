import { describe, expect, it } from "vitest";
import { recruitName } from "./recruit-name";

describe("recruit name", () => {
  it("prefers the character, then a real display name", () => {
    expect(
      recruitName({ characterName: "Jadross", displayName: "jadross", email: "jadross@example.test" }),
    ).toBe("Jadross");
    expect(recruitName({ displayName: "Alex", email: "jadross@example.test" })).toBe("Alex");
    expect(recruitName({ displayName: "  ", email: "jadross@example.test" })).toBe("Recruit");
  });

  it("never shows the mailbox name", () => {
    expect(recruitName({ displayName: "jadross", email: "jadross@example.test" })).toBe("Recruit");
    expect(recruitName({ displayName: "jadross@example.test", email: "jadross@example.test" })).toBe("Recruit");
    expect(recruitName({})).toBe("Recruit");
  });
});
