import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "./backgrounds";
import {
  CRAFTER_TOOL_IDS,
  ELF_SKILL_IDS,
  SKILLED_TOOL_IDS,
  alsoTrainedLabels,
  automaticGrantLabels,
  characterSkillIds,
  creationChoices,
  featsThatGrantProficiencies,
  grantPicksMissing,
  proficiencyRecord,
  resolveCreationGrants,
} from "./proficiency-grants";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261106120000_creation_proficiency_grants.sql"),
  "utf8",
);

describe("creation proficiency grants", () => {
  it("asks Skilled for three new skills or tools and stores them apart from the background", () => {
    const input = {
      backgroundId: "scribe",
      speciesId: "dwarf",
      toolId: "calligrapher",
      featPicks: [] as string[],
      speciesPick: "",
    };
    expect(grantPicksMissing(input)).toEqual(["Choose three skills or tools."]);
    expect(grantPicksMissing({ ...input, featPicks: ["skill:investigation", "skill:history", "tool:lute"] })).toEqual([
      "Choose a proficiency you do not already have.",
    ]);
    const granted = resolveCreationGrants({
      ...input,
      featPicks: ["skill:athletics", "tool:thieves", "tool:lute"],
    });
    expect(granted).toEqual({
      ok: true,
      skills: ["athletics"],
      tools: ["thieves", "lute"],
      languages: [],
      weapons: [],
    });
    const options = creationChoices(input).find((choice) => choice.key === "feat");
    expect(options?.count).toBe(3);
    expect(options?.options.some((option) => option.token === "skill:investigation")).toBe(false);
    expect(options?.options.some((option) => option.token === "tool:calligrapher")).toBe(false);
    expect(options?.options.some((option) => option.token === "tool:lute")).toBe(true);
    expect(options?.options.some((option) => option.id === "vehicles_land")).toBe(false);
  });

  it("limits Crafter to the fast-crafting artisan tools", () => {
    const options = creationChoices({
      backgroundId: "artisan",
      speciesId: "gnome",
      toolId: "alchemist",
      featPicks: [],
    }).find((choice) => choice.key === "feat");
    expect(options?.options.map((option) => option.id)).toEqual([...CRAFTER_TOOL_IDS]);
    expect(options?.options.some((option) => option.id === "alchemist")).toBe(false);
    expect(
      resolveCreationGrants({
        backgroundId: "artisan",
        speciesId: "gnome",
        toolId: "alchemist",
        featPicks: ["tool:alchemist", "tool:carpenter", "tool:mason"],
        speciesPick: "",
      }).ok,
    ).toBe(false);
    expect(
      resolveCreationGrants({
        backgroundId: "artisan",
        speciesId: "gnome",
        toolId: "carpenter",
        featPicks: ["tool:leatherworker", "tool:mason", "tool:smith"],
        speciesPick: "",
      }),
    ).toMatchObject({ ok: true, tools: ["leatherworker", "mason", "smith"], skills: [] });
  });

  it("records a human skill, an elf sense, and no invented species grant", () => {
    expect(
      creationChoices({ backgroundId: "farmer", speciesId: "human", toolId: "carpenter", featPicks: [] })
        .find((choice) => choice.key === "species")
        ?.options.some((option) => option.id === "nature"),
    ).toBe(false);
    expect(
      resolveCreationGrants({
        backgroundId: "farmer",
        speciesId: "human",
        toolId: "carpenter",
        featPicks: [],
        speciesPick: "skill:athletics",
      }),
    ).toMatchObject({ ok: true, skills: ["athletics"], weapons: [] });
    expect(grantPicksMissing({
      backgroundId: "farmer",
      speciesId: "human",
      toolId: "carpenter",
      featPicks: [],
      speciesPick: "",
    }, "species")).toEqual(["Choose one skill."]);

    const elf = creationChoices({
      backgroundId: "sailor",
      speciesId: "elf",
      toolId: "navigator",
      featPicks: [],
    }).find((choice) => choice.key === "species");
    expect(elf?.options.map((option) => option.id)).toEqual(ELF_SKILL_IDS.filter((id) => id !== "perception"));
    expect(
      resolveCreationGrants({
        backgroundId: "scribe",
        speciesId: "elf",
        toolId: "calligrapher",
        featPicks: ["skill:athletics", "skill:history", "tool:lute"],
        speciesPick: "skill:insight",
      }),
    ).toMatchObject({ ok: true, skills: ["athletics", "history", "insight"] });

    for (const speciesId of ["dwarf", "gnome", "halfling", "orc", "dragonborn", "goliath", "tiefling", "aasimar"]) {
      expect(
        creationChoices({ backgroundId: "farmer", speciesId, toolId: "carpenter", featPicks: [] }).some(
          (choice) => choice.key === "species",
        ),
      ).toBe(false);
      expect(
        resolveCreationGrants({
          backgroundId: "farmer",
          speciesId,
          toolId: "carpenter",
          featPicks: [],
          speciesPick: "",
        }),
      ).toMatchObject({ ok: true, skills: [], tools: [], languages: [], weapons: [] });
    }
  });

  it("adds improvised weapons for Tavern Brawler and refuses a pick on a plain feat", () => {
    expect(automaticGrantLabels("Tavern Brawler")).toEqual(["Improvised weapons"]);
    expect(
      resolveCreationGrants({
        backgroundId: "sailor",
        speciesId: "orc",
        toolId: "navigator",
        featPicks: [],
        speciesPick: "",
      }),
    ).toMatchObject({ ok: true, weapons: ["improvised"], skills: [], tools: [] });
    expect(
      grantPicksMissing({
        backgroundId: "criminal",
        speciesId: "orc",
        toolId: "thieves",
        featPicks: ["skill:athletics"],
        speciesPick: "",
      }),
    ).toEqual(["That feat has no proficiency to choose."]);
  });

  it("keeps every recruitment feat classified and the database list in step", () => {
    const known = featsThatGrantProficiencies();
    for (const row of BACKGROUNDS) {
      expect([...known.choice, ...known.automatic, ...known.plain]).toContain(row.feat);
    }
    for (const id of CRAFTER_TOOL_IDS) expect(migration).toContain(`'${id}'`);
    for (const id of ELF_SKILL_IDS) expect(migration).toContain(`'${id}'`);
    expect(migration).toContain("'improvised'");
    expect(migration).toContain("Choose three skills or tools.");
    expect(migration).not.toMatch(/you have proficiency|Player's Handbook/i);
    const prompts = creationChoices({
      backgroundId: "charlatan",
      speciesId: "human",
      toolId: "forgery",
      featPicks: [],
    })
      .map((choice) => `${choice.prompt} ${choice.options.map((option) => option.label).join(" ")}`)
      .join("\n");
    expect(prompts).not.toMatch(/you have proficiency|Player's Handbook/i);
    expect(SKILLED_TOOL_IDS).toContain("thieves");
    expect(SKILLED_TOOL_IDS).toContain("bagpipes");
  });

  it("shows granted skills and tools on the sheet record", () => {
    const row = {
      profession_skill: "investigation",
      profession_tool: "calligrapher",
      background_skills: ["investigation", "perception"],
      granted_skills: ["athletics", "insight"],
      granted_tools: ["thieves", "lute"],
      granted_languages: [] as string[],
      granted_weapons: ["improvised"],
    };
    expect(characterSkillIds(row)).toEqual(["investigation", "perception", "athletics", "insight"]);
    expect(alsoTrainedLabels(row)).toEqual([
      "Calligrapher's supplies",
      "Thieves' tools",
      "Lute",
      "Improvised weapons",
    ]);
    expect(proficiencyRecord(row).skills).toBe("Investigation, Perception, Athletics, Insight");
  });
});
