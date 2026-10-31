import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORLEONE_FILE, FONT_PAIR, FONT_PAIRS, headingFace, HELM_ICON, HELM_ICON_CLEAR, LOGO_DARK, LOGO_MARK } from "./brand";

function pngSize(relativePath: string): { w: number; h: number } {
  const bytes = readFileSync(path.join(process.cwd(), relativePath));
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

describe("brand fonts", () => {
  it("uses Barlow and falls back when Corleone is not on disk", () => {
    expect(FONT_PAIR === "barlow" || FONT_PAIR === "corleone").toBe(true);
    expect(FONT_PAIRS.barlow.body).toBe("Barlow");
    expect(FONT_PAIRS.barlow.ui).toBe("Barlow Condensed");
    expect(FONT_PAIRS.barlow.heading).toBe("Barlow Condensed");
    expect(FONT_PAIRS[FONT_PAIR].body).toBe("Barlow");
    expect(headingFace()).toBe("Barlow Condensed");
    expect(CORLEONE_FILE).toBe("public/fonts/private/Corleone.woff2");
    const cssEarly = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(cssEarly).toContain(
      '--font-display: Corleone, var(--font-barlow-condensed), "Barlow Condensed", sans-serif',
    );
    expect(cssEarly).toContain("/fonts/private/Corleone.woff2");
    const ignore = readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
    expect(ignore).toContain("public/fonts/private/*");
    expect(existsSync(path.join(process.cwd(), LOGO_DARK))).toBe(true);
    expect(existsSync(path.join(process.cwd(), LOGO_MARK))).toBe(true);
    expect(pngSize(HELM_ICON)).toEqual({ w: 1024, h: 1024 });
    expect(pngSize(HELM_ICON_CLEAR)).toEqual({ w: 1024, h: 1024 });
    expect(pngSize("public/icons/icon-512.png").w).toBe(512);
    expect(pngSize("public/favicon.png").w).toBeLessThan(1024);
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const layout = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(css + layout).not.toMatch(/League Spartan|Cinzel|Lato/);
  });
});
