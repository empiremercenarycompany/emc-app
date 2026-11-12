import { describe, expect, it } from "vitest";
import { characterCultures, characterLanguages, knowledgeModifiers, passiveScore } from "./skills";

describe("sirath skill modifiers", () => {
  it("matches the sheet formula the SQL function uses", () => {
    const mods = knowledgeModifiers({
      level: 1,
      intelligence: 14,
      wisdom: 10,
      profession_skill: "arcana",
    });
    expect(mods.alchemy).toBe(4);
    expect(passiveScore(mods.alchemy)).toBe(14);
    expect(mods.history).toBe(2);
    expect(
      knowledgeModifiers({
        level: 1,
        intelligence: 14,
        wisdom: 10,
        proficiencyRows: [{ kind: "skill", optionId: "history" }],
      }).history,
    ).toBe(4);
    expect(
      knowledgeModifiers({
        level: 1,
        intelligence: 14,
        wisdom: 10,
        profession_skill: "arcana",
        skill_mods: { alchemy: 9 },
      }).alchemy,
    ).toBe(9);
  });

  it("reads staff cultures and does not treat species as one", () => {
    expect(characterCultures({ species: "halfling" })).toEqual([]);
    expect(characterCultures({ cultures: ["example-folk"], species: "human" })).toEqual(["example-folk"]);
    expect(characterLanguages({ granted_languages: ["halfling"] })).toContain("Halfling");
  });
});
