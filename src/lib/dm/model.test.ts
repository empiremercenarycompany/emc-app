import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addCharacterProficiencies,
  addNpcDetails,
  chosenSessionId,
  DM_CHARACTER_COLUMNS,
  mergeRoster,
  parseNpcs,
  parseNotes,
  parseSessions,
  relationMissing,
  skillsFromSheet,
} from "./model";

const ROOT = path.resolve(__dirname, "../../..");

describe("dm table rows", () => {
  it("reads character names and sheet skills without the rest of the sheet", () => {
    const people = mergeRoster(
      [
        {
          character_id: "1",
          characters: {
            id: "1",
            name: "Example Fighter",
            class: "Fighter",
            level: 3,
            profession_skill: "athletics",
            background_skills: ["perception"],
            granted_skills: ["stealth"],
            sheet: { skills: ["Insight"], hp: 12, notes: "hidden aside" },
          },
        },
        {
          character_id: "1",
          characters: { id: "1", name: "Example Fighter", class: "Fighter", level: 3 },
        },
      ],
      [
        {
          character_id: "2",
          characters: { id: "2", name: "Example Scout", class: null, level: 1 },
        },
      ],
    );
    expect(people.map((person) => person.name)).toEqual(["Example Fighter", "Example Scout"]);
    expect(people[0]).toMatchObject({
      classLabel: "Fighter",
      level: 3,
      professionSkill: "athletics",
      backgroundSkills: ["perception"],
      grantedSkills: ["stealth"],
      recordedSkills: ["Insight"],
    });
    expect(people[1].classLabel).toBe("Not yet inducted");
    expect(JSON.stringify(people)).not.toContain("hidden aside");
    expect(skillsFromSheet({ skills: ["Stealth"], hp: 8 })).toEqual(["Stealth"]);
  });

  it("adds skill rows and keeps a closed npc closed", () => {
    const withRows = addCharacterProficiencies(
      [
        {
          id: "1",
          name: "Example Fighter",
          classLabel: "Fighter",
          level: 1,
          professionSkill: null,
          backgroundSkills: [],
          grantedSkills: [],
          recordedSkills: [],
          proficiencyRows: [],
        },
      ],
      [{ character_id: "1", kind: "skill", option_id: "insight" }],
    );
    expect(withRows[0].proficiencyRows).toEqual([{ kind: "skill", optionId: "insight" }]);

    const parsed = parseNpcs([
      { id: "a", name: "Example NPC", summary: "", example: true, dm_only: true },
      { id: "b", name: "Published example", summary: "A public line", example: true, dm_only: false },
    ]);
    const detailed = addNpcDetails(
      parsed,
      [
        { entry_id: "a", voice: "quiet", secrets: "closed example secret", banter: ["example line"], dm_only: true },
        { entry_id: "b", dm_only: false },
      ],
      [{ entry_id: "a", kind: "skill", option_id: "stealth" }],
    );
    expect(detailed[0]).toMatchObject({
      description: "",
      personality: "",
      voice: "quiet",
      secrets: "closed example secret",
      banter: ["example line"],
      example: true,
      dmOnly: true,
    });
    expect(detailed[1].dmOnly).toBe(false);
    expect(detailed[1].description).toBe("A public line");
  });

  it("fails closed when a dossier row omits the flag", () => {
    const [npc] = addNpcDetails(parseNpcs([{ id: "b", name: "Published example", dm_only: false }]), [
      { entry_id: "b", voice: "soft" },
    ], []);
    expect(npc.dmOnly).toBe(true);
    expect(npc.voice).toBe("soft");
  });

  it("labels a session and opens the next one on or after today", () => {
    const sessions = parseSessions([
      { id: "s1", title: "First table", session_date: "2026-11-07", squads: { name: "North" } },
    ]);
    expect(sessions).toEqual([
      { id: "s1", label: "First table · 2026-11-07 · North", sessionDate: "2026-11-07" },
    ]);
    expect(chosenSessionId(sessions, "other", "2026-11-10")).toBe("s1");
    expect(chosenSessionId(sessions, "s1", "2026-11-10")).toBe("s1");
    const dated = [
      { id: "past", sessionDate: "2026-11-01" },
      { id: "later", sessionDate: "2026-11-20" },
      { id: "today", sessionDate: "2026-11-10" },
      { id: "undated", sessionDate: null },
    ];
    expect(chosenSessionId(dated, undefined, "2026-11-10")).toBe("today");
    expect(chosenSessionId(dated, "past", "2026-11-10")).toBe("past");
    expect(chosenSessionId(dated, "missing", "2026-11-15")).toBe("later");
    expect(chosenSessionId(dated, undefined, "2026-12-01")).toBe("later");
    expect(
      chosenSessionId(
        [
          { id: "older", sessionDate: "2026-09-01" },
          { id: "old", sessionDate: "2026-10-01" },
        ],
        undefined,
        "2026-11-10",
      ),
    ).toBe("old");
    expect(parseNotes([{ id: "n1", body: "Bring the map.", created_at: "2026-11-07T12:00:00Z" }])).toEqual([
      { id: "n1", body: "Bring the map.", createdAt: "2026-11-07T12:00:00Z" },
    ]);
  });

  it("treats a missing book as empty rather than a hard failure", () => {
    expect(relationMissing(null)).toBe(false);
    expect(relationMissing({ code: "PGRST205", message: "Could not find the table" })).toBe(true);
    expect(relationMissing({ message: "relation does not exist" })).toBe(true);
    expect(relationMissing({ code: "42501", message: "permission denied" })).toBe(false);
  });

  it("does not ask for a profile address or a real name", () => {
    expect(DM_CHARACTER_COLUMNS.split(",").map((part) => part.trim())).toEqual([
      "id",
      "name",
      "class",
      "level",
      "profession_skill",
      "background_skills",
      "granted_skills",
      "sheet",
    ]);
    const files = [
      "src/lib/dm/load.ts",
      "src/lib/dm/model.ts",
      "src/lib/actions/dm.ts",
      "src/app/dm/page.tsx",
      "src/components/dm-board.tsx",
    ];
    expect(DM_CHARACTER_COLUMNS).not.toContain("user_id");
    expect(DM_CHARACTER_COLUMNS).not.toContain("display_name");
    for (const file of files) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(text.toLowerCase()).not.toContain("email");
    }
    const action = readFileSync(path.join(ROOT, "src/lib/actions/dm.ts"), "utf8");
    expect(action).toContain('.select("app_role")');
    expect(action).not.toContain("display_name");
  });
});
