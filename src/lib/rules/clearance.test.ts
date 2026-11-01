import { describe, expect, it } from "vitest";
import { CLEARANCE_LADDER, clearanceRank, PILLAR_INTERVAL } from "./clearance";

describe("clearance ranks", () => {
  it("keeps the week thresholds", () => {
    expect(CLEARANCE_LADDER.map((tier) => tier.week)).toEqual([4, 10, 20, 36, 52]);
    expect(PILLAR_INTERVAL).toBe(26);
  });

  it("names the civic honors and numbers later pillars", () => {
    expect(clearanceRank(null)).toBeNull();
    expect(clearanceRank(3)).toBeNull();
    expect(clearanceRank(4)).toBe("Known");
    expect(clearanceRank(9)).toBe("Known");
    expect(clearanceRank(10)).toBe("Trusted");
    expect(clearanceRank(19)).toBe("Trusted");
    expect(clearanceRank(20)).toBe("Vouched For");
    expect(clearanceRank(35)).toBe("Vouched For");
    expect(clearanceRank(36)).toBe("Honored");
    expect(clearanceRank(51)).toBe("Honored");
    expect(clearanceRank(52)).toBe("Esteemed of Bleakspire");
    expect(clearanceRank(77)).toBe("Esteemed of Bleakspire");
    expect(clearanceRank(78)).toBe("Pillar of Bleakspire");
    expect(clearanceRank(103)).toBe("Pillar of Bleakspire");
    expect(clearanceRank(104)).toBe("Pillar of Bleakspire II");
    expect(clearanceRank(130)).toBe("Pillar of Bleakspire III");
    expect(clearanceRank(156)).toBe("Pillar of Bleakspire IV");
  });
});
