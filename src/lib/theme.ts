/** Appearance choice. Stored in localStorage. No database column. */
export const THEME_KEY = "emc-theme";

export const THEME_CHOICES = ["system", "light", "dark"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ResolvedTheme = "light" | "dark";

/**
 * Browser chrome behind the status bar.
 * Light stays the main charcoal #1A1613. Dark matches the night ledger page.
 * The manifest stays Iron Black #111111.
 */
export const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: "#1A1613",
  dark: "#1C1916",
};

/** Night ledger. Body bone on the page, dimmer bone for captions. */
export const DARK_PAGE = "#1C1916";
export const DARK_RAISED = "#26211C";
export const DARK_INK = "#D9CBA8";
export const DARK_CAPTION = "#A89880";

/** Day field journal. The page is warm paper. The ink is the night page color. */
export const LIGHT_PAGE = "#F4EBD8";
export const LIGHT_RAISED = "#E9DCC0";
export const LIGHT_INK = "#1C1916";
export const LIGHT_CAPTION = "#5C4632";

/** Worn leather binding. Shared by both themes. Header strip sits above it. */
export const LEATHER = "#4A2E1E";
export const HEADER_STRIP = "#C6B08A";
export const CHROME_INK = "#E7D7B4";
export const BRAND_RED = "#B11217";
export const PARCHMENT_ON_RED = "#F4F1E8";

export function parseThemeChoice(value: string | null | undefined): ThemeChoice {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "light") return "light";
  if (choice === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}

type ThemeTarget = {
  dataset: { theme?: string; themeChoice?: string };
  style: { colorScheme: string };
};

type ThemeMeta = {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
};

/** Apply a resolved theme to the document root and the theme-color meta tags. */
export function applyTheme(choice: ThemeChoice, prefersDark: boolean, root: ThemeTarget, metas: ThemeMeta[]): ResolvedTheme {
  const theme = resolveTheme(choice, prefersDark);
  root.dataset.theme = theme;
  root.dataset.themeChoice = choice;
  root.style.colorScheme = theme;
  const color = THEME_COLOR[theme];
  for (const meta of metas) {
    meta.setAttribute("content", color);
    meta.removeAttribute("media");
  }
  return theme;
}

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const color = hex.startsWith("#") ? hex : `#${hex}`;
  return 0.2126 * channel(color, 1) + 0.7152 * channel(color, 3) + 0.0722 * channel(color, 5);
}

/** WCAG 2 contrast ratio. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Blocking head script. Sets data-theme before paint from localStorage, or from
 * prefers-color-scheme when the choice is system or missing.
 */
export function themeBootScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_KEY)};var c=localStorage.getItem(k);if(c!=="light"&&c!=="dark")c="system";var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=c==="dark"||(c!=="light"&&dark)?"dark":"light";var e=document.documentElement;e.dataset.theme=t;e.dataset.themeChoice=c;e.style.colorScheme=t;var color=t==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}";var nodes=document.querySelectorAll('meta[name="theme-color"]');if(!nodes.length){var m=document.createElement("meta");m.setAttribute("name","theme-color");m.setAttribute("content",color);document.head.appendChild(m);}else{for(var i=0;i<nodes.length;i++){nodes[i].setAttribute("content",color);nodes[i].removeAttribute("media");}}}catch(err){}})();`;
}
