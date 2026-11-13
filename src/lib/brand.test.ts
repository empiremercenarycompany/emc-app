import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import {
  CORLEONE_DUE_FAMILY,
  CORLEONE_DUE_FILE,
  CORLEONE_FAMILY,
  CORLEONE_FILE,
  FONT_PAIR,
  FONT_PAIRS,
  accentFace,
  headingFace,
  LOGO_MASTER,
  LOGO_SMALL,
} from "./brand";

function pngSize(relativePath: string): { w: number; h: number } {
  const bytes = readFileSync(path.join(process.cwd(), relativePath));
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

/** True when the PNG can store a transparent corner (RGBA, or a palette with tRNS). */
function pngHasAlpha(relativePath: string): boolean {
  const bytes = readFileSync(path.join(process.cwd(), relativePath));
  const color = bytes[25];
  if (color === 4 || color === 6) return true;
  let offset = 8;
  while (offset + 8 < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "tRNS") return true;
    if (type === "IEND") break;
    offset += 12 + length;
  }
  return false;
}

describe("brand fonts", () => {
  it("uses Bebas Neue for chrome and Nunito Sans for body", () => {
    expect(FONT_PAIR === "bebas" || FONT_PAIR === "corleone").toBe(true);
    expect(FONT_PAIRS.bebas.body).toBe("Nunito Sans");
    expect(FONT_PAIRS.bebas.ui).toBe("Bebas Neue");
    expect(FONT_PAIRS.bebas.heading).toBe("Bebas Neue");
    expect(FONT_PAIRS[FONT_PAIR].body).toBe("Nunito Sans");
    expect(headingFace()).toBe("Bebas Neue");
    expect(accentFace()).toBe(existsSync(path.join(process.cwd(), CORLEONE_DUE_FILE)) ? "Corleone Due" : "Nunito Sans");
    expect(CORLEONE_FAMILY).toBe("Corleone");
    expect(CORLEONE_DUE_FAMILY).toBe("Corleone Due");
    expect(CORLEONE_FILE).toBe("public/fonts/corleone/Corleone-Regular.woff2");
    expect(CORLEONE_DUE_FILE).toBe("public/fonts/corleone/Corleone-Due-Regular.woff2");
    const cssEarly = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(cssEarly).toContain(
      '--font-display: "Bebas Neue", "Arial Narrow", sans-serif',
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
    expect(existsSync(path.join(process.cwd(), LOGO_MASTER))).toBe(true);
    expect(existsSync(path.join(process.cwd(), LOGO_SMALL))).toBe(true);
    const masterSvg = readFileSync(path.join(process.cwd(), LOGO_MASTER), "utf8");
    const smallSvg = readFileSync(path.join(process.cwd(), LOGO_SMALL), "utf8");
    for (const svg of [masterSvg, smallSvg]) {
      expect(svg).toContain("#111111");
      expect(svg).toContain("#B11217");
      expect(svg).toContain("#DFD5CC");
      expect(svg).not.toMatch(/<text[\s>]|<image[\s>]|filter=/i);
    }
    expect(masterSvg).toContain("#D5B793");
    expect(pngSize("public/icons/icon-512.png")).toEqual({ w: 512, h: 512 });
    expect(pngSize("public/icons/icon-192.png")).toEqual({ w: 192, h: 192 });
    expect(pngSize("public/icons/icon-64.png")).toEqual({ w: 64, h: 64 });
    expect(pngSize("public/icons/icon-maskable-512.png")).toEqual({ w: 512, h: 512 });
    expect(pngSize("public/icons/apple-touch-icon.png")).toEqual({ w: 180, h: 180 });
    expect(pngSize("public/icons/icon-32.png")).toEqual({ w: 32, h: 32 });
    expect(pngSize("public/icons/icon-16.png")).toEqual({ w: 16, h: 16 });
    expect(pngSize("public/favicon.png")).toEqual({ w: 32, h: 32 });
    expect(pngSize("public/icons/apple-splash.png")).toEqual({ w: 1170, h: 2532 });
    expect(pngHasAlpha("public/icons/icon-512.png")).toBe(true);
    expect(pngHasAlpha("public/icons/icon-32.png")).toBe(true);
    expect(pngHasAlpha("public/icons/apple-touch-icon.png")).toBe(true);
    expect(pngHasAlpha("public/icons/apple-splash.png")).toBe(true);
    expect(pngHasAlpha("public/favicon.png")).toBe(true);
    const ico = readFileSync(path.join(process.cwd(), "public/favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    expect(ico.readUInt8(6)).toBe(16);
    expect(ico.readUInt8(22)).toBe(32);
    expect(existsSync(path.join(process.cwd(), "public/brand/emc_mark.png"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public/brand/emc_app_icon.png"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public/brand/emc_badge_light.png"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public/brand/logo_dark.png"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public/brand/emc_logo.png"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "public/brand/emc_mark_helm_square.png"))).toBe(false);
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const layout = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(css + layout).not.toMatch(/League Spartan|Cinzel|Lato/);
  });
});
