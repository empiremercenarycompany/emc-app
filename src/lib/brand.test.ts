import { describe, expect, it } from "vitest";
import { FONT_PAIR, FONT_PAIRS } from "./brand";

describe("brand fonts", () => {
  it("keeps one switch and defaults the body to League Spartan", () => {
    expect(FONT_PAIR === "spartan" || FONT_PAIR === "cinzel").toBe(true);
    expect(FONT_PAIRS.spartan.body).toBe("League Spartan");
    expect(FONT_PAIRS[FONT_PAIR].body).toBeTruthy();
    expect(FONT_PAIRS[FONT_PAIR].heading).toBeTruthy();
  });
});
