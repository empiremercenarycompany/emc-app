import { describe, expect, it } from "vitest";
import type { CharacterRow } from "@/lib/types";
import { characterCultures, characterLanguages, knowledgeModifiers, passiveScore } from "./skills";

function sheet(partial: Partial<CharacterRow>): CharacterRow {
  return {
    id: "c",
    user_id: "u",
    guild_id: null,
    squad_id: null,
    name: "Example",
    species: "human",
    profession: null,
    profession_tool: null,
    profession_skill: null,
    origin_word: null,
    class: null,
    level: 1,
    rank: "Recruit",
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 14,
    wisdom: 12,
    charisma: 10,
    physical_points: 0,
    constitution_points: 0,
    mental_points: 0,
    inducted_at: null,
    notes: null,
    ...partial,
  };
}

describe("sirath skill modifiers", () => {
  it("uses the sheet formula and the Company names for Alchemy and Culture", () => {
    const mods = knowledgeModifiers(
      sheet({
        profession_skill: "arcana",
        background_skills: ["history"],
        granted_skills: ["religion"],
      }),
    );
    expect(mods.alchemy).toBe(4);
    expect(passiveScore(mods.alchemy)).toBe(14);
    expect(mods.history).toBe(4);
    expect(mods.culture).toBe(4);
    expect(mods.medicine).toBe(1);
    expect(mods.nature).toBe(2);
    expect(mods.survival).toBe(1);
  });

  it("does not treat species as a culture, and does read a granted language", () => {
    const character = sheet({ species: "halfling", granted_languages: ["halfling"] });
    expect(characterCultures(character)).toEqual([]);
    expect(characterLanguages(character)).toContain("Halfling");
  });
});
