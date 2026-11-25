import { afterEach, describe, expect, it } from "vitest";
import { johnChoices } from "@/config/johnChoices";
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
    expect(visibleTerm("faq-played")?.plain).toMatch(/professional Dungeon Master/);
    expect(visibleTerm("faq-gym")?.plain).toMatch(/workout programming from a coach/);
    expect(visibleTerm("faq-muster")).toBeNull();
    expect(visibleCodex().some((term) => term.id === "faq-cost" || term.id === "faq-every-saturday")).toBe(false);
    expect(visibleCodex().some((term) => term.plain.includes("$120"))).toBe(false);
  });

  afterEach(() => {
    johnChoices.faqShowCostQuestion = false;
    johnChoices.faqShow120 = false;
    johnChoices.faqShowEverySaturday = false;
    johnChoices.shieldmateFullSlot = "waitlist";
    johnChoices.confirmationEmailIncludeWaiver = false;
  });

  it("shows the cost and Saturday questions only when those flags are on", () => {
    johnChoices.faqShowCostQuestion = true;
    const cost = visibleCodex().find((term) => term.id === "faq-cost");
    expect(cost?.plain).toBe(
      "$120 a month with your Empire Strength and Fitness membership included, or $60 a month if you're a current Empire member. Month to month, cancel anytime.",
    );
    expect(cost?.plain).not.toMatch(/shieldmate/i);
    expect(cost?.plain.indexOf("$120")).toBeLessThan(cost!.plain.indexOf("$60"));
    expect(visibleCodex().some((term) => term.id === "faq-every-saturday")).toBe(false);
    johnChoices.faqShowEverySaturday = true;
    const saturday = visibleCodex().find((term) => term.id === "faq-every-saturday")?.plain ?? "";
    expect(saturday).toMatch(/7 to 10 PM/);
    expect(saturday).toContain("If you're 16 or 17, Empire Strength and Fitness may ask you to sign the gym's waiver.");
    expect(saturday).not.toMatch(/18\+|18 and up|adults-only|adults only/i);
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
