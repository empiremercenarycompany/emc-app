import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isValidStartingArray } from "./starting-array";
import { skillLabel } from "./skill-names";
import {
  BACKGROUNDS,
  EXCLUDED_BACKGROUND_IDS,
  backgroundById,
  recruitScores,
} from "./backgrounds";

describe("recruitment backgrounds", () => {
  it("lists the twelve backgrounds and leaves Magic Initiate out", () => {
    expect(BACKGROUNDS).toHaveLength(12);
    const ids = BACKGROUNDS.map((row) => row.id);
    for (const excluded of EXCLUDED_BACKGROUND_IDS) expect(ids).not.toContain(excluded);
    expect(BACKGROUNDS.every((row) => !/magic initiate/i.test(row.feat))).toBe(true);
    expect(backgroundById("farmer")?.tools).toEqual(["carpenter"]);
    expect(backgroundById("artisan")?.toolChoice).toBe("artisan");
    expect((backgroundById("artisan")?.tools.length ?? 0) > 1).toBe(true);
    expect(skillLabel("religion")).toBe("Culture");
    expect(skillLabel(backgroundById("hermit")?.skills[1] ?? "")).toBe("Culture");
    const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20261031130000_recruitment_papers.sql"), "utf8");
    for (const row of BACKGROUNDS) expect(sql).toContain(`'${row.id}'`);
    expect(sql).not.toMatch(/'\s*acolyte\s*'/);
  });

  it("fills +1/+1/+1 or +2/+1 only on the background abilities", () => {
    const farmer = backgroundById("farmer")!;
    const even = recruitScores("plus1", farmer.abilities);
    expect(even).toMatchObject({ strength: 9, constitution: 9, wisdom: 9, dexterity: 8 });
    expect(isValidStartingArray(even!)).toBe(true);
    const tilted = recruitScores("plus2", farmer.abilities, "strength", "wisdom");
    expect(tilted).toMatchObject({ strength: 10, wisdom: 9, constitution: 8 });
    expect(isValidStartingArray(tilted!)).toBe(true);
    expect(recruitScores("plus2", farmer.abilities, "strength", "strength")).toBeNull();
    expect(recruitScores("plus2", farmer.abilities, "charisma", "wisdom")).toBeNull();
  });
});
