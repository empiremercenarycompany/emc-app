import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORLEONE_FILE, FONT_PAIR, FONT_PAIRS, headingFace, LOGO_FILE } from "./brand";

describe("brand fonts", () => {
  it("uses Barlow and falls back when Corleone is not on disk", () => {
    expect(FONT_PAIR === "barlow" || FONT_PAIR === "corleone").toBe(true);
    expect(FONT_PAIRS.barlow.body).toBe("Barlow");
    expect(FONT_PAIRS.barlow.ui).toBe("Barlow Condensed");
    expect(FONT_PAIRS.barlow.heading).toBe("Barlow Condensed");
    expect(FONT_PAIRS[FONT_PAIR].body).toBe("Barlow");
    expect(headingFace()).toBe("Barlow Condensed");
    expect(CORLEONE_FILE.startsWith("public/brand/local/")).toBe(true);
    expect(LOGO_FILE.startsWith("public/brand/local/")).toBe(true);
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const layout = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(css + layout).not.toMatch(/League Spartan|Cinzel|Lato/);
  });
});
