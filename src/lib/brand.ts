import { existsSync } from "node:fs";
import path from "node:path";

/**
 * One switch.
 * barlow: body is Barlow, and headings are Barlow Condensed.
 * corleone: the same, except big titles use Corleone when the gitignored file is present.
 * Corleone is never committed. A missing file keeps Barlow Condensed.
 */
export const FONT_PAIR = "barlow" as "barlow" | "corleone";

export const FONT_PAIRS = {
  barlow: {
    body: "Barlow",
    ui: "Barlow Condensed",
    heading: "Barlow Condensed",
  },
  corleone: {
    body: "Barlow",
    ui: "Barlow Condensed",
    heading: "Corleone",
  },
} as const;

/** Gitignored. Drop the file here locally. Do not commit it. */
export const CORLEONE_FILE = "public/brand/local/Corleone.woff2";

/** Full badge on black. Splash and About. */
export const LOGO_DARK = "public/brand/logo_dark.png";

/** Transparent white and red. Dark backgrounds only. */
export const LOGO_MARK = "public/brand/emc_logo.png";

export function localFileReady(relativePath: string): boolean {
  return existsSync(path.join(process.cwd(), relativePath));
}

/** Big titles only. Subheads, buttons, labels, and tabs stay Barlow Condensed. */
export function headingFace(): "Barlow Condensed" | "Corleone" {
  if (FONT_PAIR !== "corleone") return "Barlow Condensed";
  if (!localFileReady(CORLEONE_FILE)) return "Barlow Condensed";
  return "Corleone";
}
