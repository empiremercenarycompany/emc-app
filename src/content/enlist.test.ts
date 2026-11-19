import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENLIST_BACKSTORY_PROMPT, ENLIST_CITY_BLURB } from "./enlist";

const ROOT = path.resolve(__dirname, "../..");

const BLURB =
  "Bleakspire is an old fortress city on a cold, rugged island. Its walls were built for far more people than live behind them now. For years it answered to an 'Emperor', a very big title for a tin-pot despot propped up by his Ivory Guard, whose whole empire was one small city. About sixteen years ago, a band of adventurers threw him down and called themselves the Empire Mercenary Company. Now the Mayor governs. The Company takes on more work, and more say, every season, and it means to drag Bleakspire out of obscurity and make it a thriving port. Your character was born here: a commoner who grew up in these streets before enlisting with the Company.";

const PROMPT =
  "Tell us about your life before you enlisted: who raised you, what your family did to get by in Bleakspire, and what finally made you join the Company. A few sentences is plenty.";

describe("enlist copy", () => {
  it("uses the approved city blurb and backstory prompt", () => {
    expect(ENLIST_CITY_BLURB).toBe(BLURB);
    expect(ENLIST_BACKSTORY_PROMPT).toBe(PROMPT);
    const source = readFileSync(path.join(ROOT, "src/content/enlist.ts"), "utf8").toLowerCase();
    expect(source).not.toContain("pending");
  });

  it("keeps banned phrases out of the enlist screen", () => {
    const files = ["src/content/enlist.ts", "src/components/intake-form.tsx", "src/app/intake/page.tsx"];
    for (const file of files) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(text).not.toMatch(/personal training/i);
      expect(text).not.toMatch(/battle master/i);
    }
  });
});
