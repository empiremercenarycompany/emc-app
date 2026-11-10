import { describe, expect, it } from "vitest";
import {
  proficientAtTable,
  proficiencyLabels,
  resolveSkillId,
  skillCatalog,
  trainedSkillIds,
  type TablePerson,
} from "./table-proficiency";

const catalog = skillCatalog([
  { id: "arcana", displayName: "Alchemy", defaultName: "Arcana" },
  { id: "religion", displayName: "Culture", defaultName: "Religion" },
]);

describe("table skill lookup", () => {
  it("unions profession, background, and granted skills once", () => {
    const person: TablePerson = {
      name: "Example Fighter",
      professionSkill: "investigation",
      backgroundSkills: ["investigation", "perception"],
      grantedSkills: ["athletics", "insight"],
    };
    expect(trainedSkillIds(person, catalog)).toEqual([
      "investigation",
      "perception",
      "athletics",
      "insight",
    ]);
    expect(proficientAtTable("perception", [person], catalog)).toEqual([
      { name: "Example Fighter", example: false },
    ]);
  });

  it("counts a skill row and ignores tools, languages, and gaming", () => {
    const person: TablePerson = {
      name: "Example Scout",
      proficiencyRows: [
        { kind: "skill", optionId: "stealth" },
        { kind: "tool", optionId: "thieves" },
        { kind: "language", optionId: "elvish" },
        { kind: "gaming", optionId: "dice" },
      ],
    };
    expect(trainedSkillIds(person, catalog)).toEqual(["stealth"]);
    expect(proficientAtTable("thieves", [person], catalog)).toEqual([]);
    expect(proficientAtTable("Stealth", [person], catalog)).toEqual([
      { name: "Example Scout", example: false },
    ]);
  });

  it("matches a recorded sheet name, including the rules name and the company label", () => {
    const person: TablePerson = {
      name: "Example Scholar",
      recordedSkills: ["Arcana", "Culture", "Sleight of Hand"],
    };
    expect(trainedSkillIds(person, catalog)).toEqual(["arcana", "religion", "sleight_of_hand"]);
    expect(resolveSkillId("Alchemy", catalog)).toBe("arcana");
    expect(resolveSkillId("religion", catalog)).toBe("religion");
    expect(proficientAtTable("sleight of hand", [person], catalog).map((row) => row.name)).toEqual([
      "Example Scholar",
    ]);
  });

  it("lists trained people in table order and keeps an example mark", () => {
    const people: TablePerson[] = [
      { name: "Example Fighter", professionSkill: "athletics" },
      { name: "  ", grantedSkills: ["athletics"] },
      { name: "Example NPC", example: true, proficiencyRows: [{ kind: "skill", optionId: "athletics" }] },
      { name: "Example Scout", grantedSkills: ["stealth"] },
    ];
    expect(proficientAtTable("athletics", people, catalog)).toEqual([
      { name: "Example Fighter", example: false },
      { name: "Example NPC", example: true },
    ]);
    expect(proficientAtTable("", people, catalog)).toEqual([]);
    expect(proficientAtTable("not-a-skill", people, catalog)).toEqual([]);
  });

  it("labels npc skills and leaves other kinds as their stored names", () => {
    expect(
      proficiencyLabels(
        [
          { kind: "skill", optionId: "stealth" },
          { kind: "skill", optionId: "stealth" },
          { kind: "tool", optionId: "thieves" },
          { kind: "language", optionId: "elvish" },
        ],
        catalog,
      ),
    ).toEqual(["Stealth", "Thieves' tools", "Elvish"]);
  });
});
