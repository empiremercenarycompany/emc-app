import { describe, expect, it } from "vitest";
import { ALCHEMY, CULTURE, skillLabel } from "./skill-names";

describe("skill labels", () => {
  it("renames two ids and leaves the rest", () => {
    expect(skillLabel("arcana")).toBe(ALCHEMY);
    expect(skillLabel("Arcana")).toBe(ALCHEMY);
    expect(skillLabel("religion")).toBe(CULTURE);
    expect(skillLabel("Religion")).toBe(CULTURE);
    expect(skillLabel("stealth", "Stealth")).toBe("Stealth");
  });
});
