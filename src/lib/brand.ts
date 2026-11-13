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

/** FINAL full logo. Header, sign-in, About, and the splash, at about 128px and up. */
export const LOGO_MASTER = "public/brand/EMC_logo_master-app-mark-dark_2026-11-13_FINAL.svg";

/** FINAL small mark. Favicon, apple touch icon, PWA icons, and in-app marks under 128px. */
export const LOGO_SMALL = "public/brand/EMC_logo_small-mark_2026-11-13_FINAL.svg";

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
