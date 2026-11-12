import { existsSync } from "node:fs";
import path from "node:path";

/**
 * One switch for the accent line.
 * Headlines, buttons, and fact lines are Bebas Neue.
 * Body is Nunito Sans. Corleone Due is the sign-off only, when the gitignored file is present.
 */
export const FONT_PAIR = "bebas" as "bebas" | "corleone";

export const FONT_PAIRS = {
  bebas: {
    body: "Nunito Sans",
    ui: "Bebas Neue",
    heading: "Bebas Neue",
  },
  corleone: {
    body: "Nunito Sans",
    ui: "Bebas Neue",
    heading: "Bebas Neue",
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

/** Chrome titles. Bebas Neue, all caps. Corleone is not a heading face. */
export function headingFace(): "Bebas Neue" {
  return "Bebas Neue";
}

/** The one accent line. A missing woff2 keeps Nunito Sans. */
export function accentFace(): "Nunito Sans" | "Corleone Due" {
  if (localFileReady(CORLEONE_DUE_FILE)) return "Corleone Due";
  return "Nunito Sans";
}
