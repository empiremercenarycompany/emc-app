import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import {
  APP_ICON,
  CORLEONE_DUE_FAMILY,
  CORLEONE_DUE_FILE,
  CORLEONE_FAMILY,
  CORLEONE_FILE,
  FONT_PAIR,
  FONT_PAIRS,
  headingFace,
  LOGO_LIGHT,
  LOGO_MARK,
} from "./brand";

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
    expect(headingFace()).toBe(existsSync(path.join(process.cwd(), CORLEONE_DUE_FILE)) ? "Corleone Due" : "Barlow Condensed");
    expect(CORLEONE_FAMILY).toBe("Corleone");
    expect(CORLEONE_DUE_FAMILY).toBe("Corleone Due");
    expect(CORLEONE_FILE).toBe("public/fonts/corleone/Corleone-Regular.woff2");
    expect(CORLEONE_DUE_FILE).toBe("public/fonts/corleone/Corleone-Due-Regular.woff2");
    const cssEarly = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(cssEarly).toContain(
      '--font-display: "Corleone Due", Corleone, var(--font-barlow-condensed), "Barlow Condensed", sans-serif',
    );
    expect(cssEarly).toContain('url("/fonts/corleone/Corleone-Regular.woff2") format("woff2")');
    expect(cssEarly).toContain('url("/fonts/corleone/Corleone-Due-Regular.woff2") format("woff2")');
    expect(cssEarly).toContain('font-family: "Corleone Due"');
    expect(cssEarly).toContain("font-display: swap");
    const ignore = readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
    expect(ignore).toContain("public/fonts/private/*");
    expect(ignore).toContain("public/fonts/corleone/");
    const example = readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
    expect(example).not.toContain("NEXT_PUBLIC_HEADING_FONT_URL");
    const tracked = execSync("git ls-files", { encoding: "utf8" });
    expect(tracked).not.toMatch(/\.(otf|ttf|woff2?)$/m);
    expect(existsSync(path.join(process.cwd(), LOGO_MARK))).toBe(true);
    expect(existsSync(path.join(process.cwd(), LOGO_LIGHT))).toBe(true);
    expect(pngSize(APP_ICON)).toEqual({ w: 1024, h: 1024 });
    expect(pngSize(LOGO_MARK)).toEqual({ w: 1024, h: 1024 });
    expect(pngSize(LOGO_LIGHT)).toEqual({ w: 1024, h: 1024 });
    expect(pngSize("public/icons/icon-512.png")).toEqual({ w: 512, h: 512 });
    expect(pngSize("public/icons/icon-192.png")).toEqual({ w: 192, h: 192 });
    expect(pngSize("public/icons/icon-maskable-512.png")).toEqual({ w: 512, h: 512 });
    expect(pngSize("public/icons/apple-touch-icon.png")).toEqual({ w: 180, h: 180 });
    expect(pngSize("public/icons/icon-32.png")).toEqual({ w: 32, h: 32 });
    expect(pngSize("public/icons/icon-16.png")).toEqual({ w: 16, h: 16 });
    expect(pngSize("public/favicon.png")).toEqual({ w: 32, h: 32 });
    expect(pngSize("public/icons/apple-splash.png")).toEqual({ w: 1170, h: 2532 });
    expect(existsSync(path.join(process.cwd(), "public/favicon.ico"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "public/brand/logo_dark.png"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public/brand/emc_logo.png"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public/brand/emc_mark_helm_square.png"))).toBe(false);
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const layout = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(css + layout).not.toMatch(/League Spartan|Cinzel|Lato/);
  });
});
