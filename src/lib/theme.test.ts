import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  BRAND_RED,
  CHROME_INK,
  DARK_CAPTION,
  DARK_INK,
  DARK_PAGE,
  DARK_RAISED,
  HEADER_STRIP,
  LEATHER,
  LIGHT_CAPTION,
  LIGHT_INK,
  LIGHT_PAGE,
  LIGHT_RAISED,
  PARCHMENT_ON_RED,
  THEME_COLOR,
  THEME_KEY,
  applyTheme,
  contrastRatio,
  parseThemeChoice,
  resolveTheme,
  themeBootScript,
} from "./theme";

describe("theme toggle", () => {
  it("follows system unless the recruit picked light or dark", () => {
    expect(parseThemeChoice(null)).toBe("system");
    expect(parseThemeChoice("nope")).toBe("system");
    expect(parseThemeChoice("system")).toBe("system");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("writes the resolved theme onto the document and the theme-color meta", () => {
    const root = { dataset: {} as { theme?: string; themeChoice?: string }, style: { colorScheme: "" } };
    const metas = [
      {
        attrs: {} as Record<string, string>,
        setAttribute(name: string, value: string) {
          this.attrs[name] = value;
        },
        removeAttribute(name: string) {
          delete this.attrs[name];
        },
      },
    ];
    expect(applyTheme("dark", false, root, metas)).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.themeChoice).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(metas[0].attrs.content).toBe(THEME_COLOR.dark);
    expect(metas[0].attrs.media).toBeUndefined();

    applyTheme("system", false, root, metas);
    expect(root.dataset.theme).toBe("light");
    expect(metas[0].attrs.content).toBe(THEME_COLOR.light);
  });

  it("applies a saved choice before paint and ignores a bad stored value", () => {
    const store = new Map<string, string>([[THEME_KEY, "dark"]]);
    type Meta = {
      attrs: Record<string, string>;
      setAttribute(name: string, value: string): void;
      removeAttribute(name: string): void;
    };
    const metas: Meta[] = [];
    const created: Meta[] = [];
    const document = {
      documentElement: { dataset: {} as Record<string, string>, style: { colorScheme: "" } },
      querySelectorAll() {
        return metas;
      },
      createElement(): Meta {
        const node: Meta = {
          attrs: {},
          setAttribute(name: string, value: string) {
            this.attrs[name] = value;
          },
          removeAttribute(name: string) {
            delete this.attrs[name];
          },
        };
        created.push(node);
        return node;
      },
      head: {
        appendChild(node: Meta) {
          metas.push(node);
        },
      },
    };
    const context = {
      document,
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
      },
      window: {
        matchMedia: () => ({ matches: false }),
      },
    };
    vm.runInNewContext(themeBootScript(), context);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themeChoice).toBe("dark");
    expect(created[0].attrs.content).toBe("#1C1916");

    store.set(THEME_KEY, "light");
    context.window = { matchMedia: () => ({ matches: true }) };
    vm.runInNewContext(themeBootScript(), context);
    expect(document.documentElement.dataset.theme).toBe("light");

    store.delete(THEME_KEY);
    vm.runInNewContext(themeBootScript(), context);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themeChoice).toBe("system");
  });
});

describe("theme contrast", () => {
  const pairs: { name: string; fg: string; bg: string; min: number }[] = [
    { name: "dark body", fg: DARK_INK, bg: DARK_PAGE, min: 4.5 },
    { name: "dark caption", fg: DARK_CAPTION, bg: DARK_PAGE, min: 4.5 },
    { name: "dark caption on a raised card", fg: DARK_CAPTION, bg: DARK_RAISED, min: 4.5 },
    { name: "dark body on a raised card", fg: DARK_INK, bg: DARK_RAISED, min: 4.5 },
    { name: "tab label on leather", fg: CHROME_INK, bg: LEATHER, min: 4.5 },
    { name: "header wordmark", fg: LIGHT_INK, bg: HEADER_STRIP, min: 4.5 },
    { name: "light body", fg: LIGHT_INK, bg: LIGHT_PAGE, min: 4.5 },
    { name: "light caption", fg: LIGHT_CAPTION, bg: LIGHT_PAGE, min: 4.5 },
    { name: "light caption on a raised card", fg: LIGHT_CAPTION, bg: LIGHT_RAISED, min: 4.5 },
    { name: "light body on a raised card", fg: LIGHT_INK, bg: LIGHT_RAISED, min: 4.5 },
    { name: "parchment on the brand red fill", fg: PARCHMENT_ON_RED, bg: BRAND_RED, min: 4.5 },
  ];

  it.each(pairs)("$name clears AA ($min:1)", ({ fg, bg, min }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it("keeps brand red off small text on the night page and the leather", () => {
    expect(contrastRatio(BRAND_RED, DARK_PAGE)).toBeLessThan(3);
    expect(contrastRatio(BRAND_RED, LEATHER)).toBeLessThan(3);
    expect(BRAND_RED).toBe("#B11217");
  });

  it("paints the stylesheet with the same pairs", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    for (const hex of [DARK_PAGE, DARK_INK, DARK_CAPTION, LIGHT_PAGE, LIGHT_INK, LIGHT_CAPTION, LEATHER, HEADER_STRIP, BRAND_RED]) {
      expect(css.toLowerCase()).toContain(hex.toLowerCase());
    }
    const manifest = readFileSync(path.join(process.cwd(), "src/app/manifest.ts"), "utf8");
    expect(manifest).toContain('"#111111"');
    expect(manifest).not.toContain(DARK_PAGE);
  });
});
