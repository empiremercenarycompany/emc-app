import { existsSync } from "node:fs";
import path from "node:path";

/**
 * One switch.
 * barlow: body is Barlow, and headings are Barlow Condensed.
 * corleone: the same, except big titles use Corleone when the gitignored woff2 is present.
 * The files are never committed. A missing file keeps Barlow Condensed 800.
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
    heading: "Corleone Due",
  },
} as const;

/** FontMesa Corleone. Gitignored. John adds these at deploy time. */
export const CORLEONE_FILE = "public/fonts/corleone/Corleone-Regular.woff2";
export const CORLEONE_DUE_FILE = "public/fonts/corleone/Corleone-Due-Regular.woff2";

/** CSS font-family names. All-caps headings use Corleone Due. Regular is mixed-case display only. */
export const CORLEONE_FAMILY = "Corleone";
export const CORLEONE_DUE_FAMILY = "Corleone Due";

/** Approved v2 icon. Helm and kettlebell on Iron Black. PWA sizes are resizes of this file. */
export const APP_ICON = "public/brand/emc_app_icon.png";

/** Approved v2 transparent mark. Header, sign-in, and About. */
export const LOGO_MARK = "public/brand/emc_mark.png";

/** Approved v2 badge on parchment. Light surfaces only. */
export const LOGO_LIGHT = "public/brand/emc_badge_light.png";

export function localFileReady(relativePath: string): boolean {
  return existsSync(path.join(process.cwd(), relativePath));
}

/** All-caps titles. A missing woff2 keeps Barlow Condensed 800 through the CSS stack. */
export function headingFace(): "Barlow Condensed" | "Corleone Due" {
  if (localFileReady(CORLEONE_DUE_FILE)) return "Corleone Due";
  return "Barlow Condensed";
}
