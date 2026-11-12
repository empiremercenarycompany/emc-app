import { describe, expect, it } from "vitest";
import { buildSirathView, forPlayer, knowsFact } from "./book";
import { FIXTURE_SOURCE } from "./fixture-source";
import { prepareCanon, rewriteSirathTokens, slugToUuid } from "./ids";

describe("sirath book", () => {
  it("hides sealed text, staff fields, and unfinished notes", () => {
    const view = buildSirathView(FIXTURE_SOURCE, "ch-a1");
    const blob = JSON.stringify(view);
    expect(blob).not.toContain("FAKE_SEALED_ALCHEMY_BODY");
    expect(blob).not.toContain("FAKE_SECRET_DISCOVERY_BODY");
    expect(blob).not.toContain("Secret Runner");
    expect(blob).not.toContain("Runner Alias");
    expect(blob).not.toMatch(/canon_ref|public_name_basis|skill_tag_reason/);
    expect(forPlayer("Whose fort it was: [TBD]. The rest of the sentence stays.")).toBe("The rest of the sentence stays.");
    expect(forPlayer("[date TBD]")).toBeNull();
    expect(forPlayer("[TBD example]")).toBeNull();
  });

  it("shows a learned name and a public name, and smudges an unknown entry", () => {
    const prepared = prepareCanon(FIXTURE_SOURCE);
    const plaza = slugToUuid("sample-plaza");
    const dock = slugToUuid("public-dock");
    const scout = slugToUuid("known-scout");
    const runner = slugToUuid("secret-runner");
    const fact = prepared.facts.find((item) => item.entry_id === plaza && item.tier === "common");
    expect(fact?.body).toContain(`{{${plaza}|Sample Plaza}}`);
    expect(fact?.body).toContain(`{{${dock}|Public Dock}}`);
    expect(fact?.body).not.toContain("{{public-dock|");
    expect(fact?.canon_ref).toBeUndefined();

    const view = buildSirathView(prepared, "ch-a1");
    const blob = JSON.stringify(view);
    expect(blob).toContain(`{{${scout}|Known Scout}}`);
    expect(blob).toContain("{{!plain|Public Dock}}");
    expect(blob).not.toContain(dock);
    expect(blob).not.toContain("Secret Runner");
    expect(blob).not.toContain(runner);
    expect(blob).toContain(`{{?`);
    const ids = new Map([
      ["sample-plaza", plaza],
      ["public-dock", dock],
    ]);
    expect(rewriteSirathTokens("{{sample-plaza|Sample Plaza}}", ids)).toBe(`{{${plaza}|Sample Plaza}}`);
  });

  it("opens the culture fact only with the culture bonus, and ignores a history roll", () => {
    const withBonus = buildSirathView(FIXTURE_SOURCE, "ch-b1");
    const culture = withBonus?.entries.find((entry) => entry.id === "known-scout")?.tiers.recall.find((fact) => fact.skill === "culture");
    expect(culture?.bonus).toEqual({ own_culture: 4, knows_language: 2, total: 6 });
    expect(culture?.how).toBe("passive");
    const without = buildSirathView(FIXTURE_SOURCE, "ch-a1");
    const sealed = without?.entries.find((entry) => entry.id === "known-scout")?.tiers.sealed ?? [];
    expect(sealed.some((fact) => fact.skill === "culture")).toBe(true);
    expect(JSON.stringify(without)).not.toContain("FAKE_CULTURE_BODY");

    const character = FIXTURE_SOURCE.characters[0];
    const alchemy = FIXTURE_SOURCE.facts.find((fact) => fact.id === "fact-alchemy-sealed");
    expect(alchemy).toBeTruthy();
    if (!alchemy) return;
    expect(knowsFact(character, alchemy, new Map([["sample-plaza:history", 30]]), FIXTURE_SOURCE.rules)).toBeNull();
    expect(knowsFact(character, alchemy, new Map([["sample-plaza:alchemy", 18]]), FIXTURE_SOURCE.rules)?.how).toBe("roll");
  });

  it("gives the recruit a smaller book", () => {
    const recruit = buildSirathView(FIXTURE_SOURCE, "ch-r1");
    const squad = buildSirathView(FIXTURE_SOURCE, "ch-a1");
    expect(recruit?.is_new_recruit).toBe(true);
    expect(squad?.is_new_recruit).toBe(false);
    expect(recruit?.home.learned_count).toBeLessThan(squad?.home.learned_count ?? 0);
  });
});
