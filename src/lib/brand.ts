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

/** Gitignored. Licensed, but never committed. woff2, then otf, then ttf. */
export const CORLEONE_FILES = [
  "public/fonts/private/Corleone.woff2",
  "public/fonts/private/Corleone.otf",
  "public/fonts/private/Corleone.ttf",
] as const;

export const CORLEONE_FILE = CORLEONE_FILES[0];

/** Approved v2 icon. Helm and kettlebell on Iron Black. PWA sizes are resizes of this file. */
export const APP_ICON = "public/brand/emc_app_icon.png";

/** Approved v2 transparent mark. Header, sign-in, and About. */
export const LOGO_MARK = "public/brand/emc_mark.png";

/** Approved v2 badge on parchment. Light surfaces only. */
export const LOGO_LIGHT = "public/brand/emc_badge_light.png";

export function localFileReady(relativePath: string): boolean {
  return existsSync(path.join(process.cwd(), relativePath));
}

/** Big titles only. Missing files keep Barlow Condensed through the CSS stack. */
export function headingFace(): "Barlow Condensed" | "Corleone" {
  if (CORLEONE_FILES.some((file) => localFileReady(file))) return "Corleone";
  return "Barlow Condensed";
}
