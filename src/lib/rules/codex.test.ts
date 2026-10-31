import { describe, expect, it } from "vitest";
import { isCodexVisible, visibleCodex, visibleTerm } from "./codex";
import raw from "./codex-terms.json";

describe("company codex", () => {
  it("hides entries John has not filled or confirmed", () => {
    const hidden = raw.terms.filter((term) => term.status !== "ready").map((term) => term.id);
    expect(hidden).toEqual(
      expect.arrayContaining([
        "grave-diggers",
        "tire-slams",
        "bonus-activities",
        "level",
        "skull-crushers",
        "company",
        "faq-muster",
      ]),
    );
    const shown = new Set(visibleCodex().map((term) => term.id));
    for (const id of hidden) expect(shown.has(id)).toBe(false);
    expect(visibleTerm("grave-diggers")).toBeNull();
    expect(visibleTerm("hp")?.plain).toMatch(/harm/);
    expect(visibleTerm("trained")?.id).toBe("proficiency");
    expect(visibleTerm("saves")?.id).toBe("saving-throw");
  });

  it("drops a ready row whose body is still flagged", () => {
    expect(
      isCodexVisible({
        id: "sample",
        term: "Sample",
        group: "emc",
        plain: "Fine [John to confirm]",
        status: "ready",
      }),
    ).toBe(false);
  });
});
