# Brand

John asked that branding come from his marketing lead. These are the rules for the app. Open choices stay in `docs/OPEN_QUESTIONS.md`. Do not invent lore.

## Colors

Confirmed. Do not add a sixth brand color.

| Token | Hex | Use |
| --- | --- | --- |
| Iron Black | `#111111` | Backgrounds, and text on parchment |
| Mercenary Red | `#B11217` | Accent, primary actions, seals. Sparingly |
| Parchment White | `#F4F1E8` | Text on iron, notices, documents |
| Steel Gray | `#5A5A5A` | Borders, inactive line icons |
| Weathered Bronze | `#8A6A3B` | Large headings, dividers, the logo frame, active line icons, rank and seal accents |

Red as text on Iron Black fails contrast, so it is not used that way. Parchment is the text on a red fill. Bronze is for large type and marks, not for body copy. Steel is not body text. Secondary text uses the contrast-safe mute `#C4BFB2`.

The approved visual direction warms how those colors are used. It does not add a brand color and it does not recolor the logo. John locked refined A on 13 Nov 2026 as light mode, the day field journal, paired with refined D as the night ledger. Light page is warm paper `#F4EBD8` (not Parchment White `#F4F1E8`), ink `#1C1916`, captions `#5C4632`, raised cards `#E9DCC0`. Both modes share the leather binding `#4A2E1E`, the tan header strip `#C6B08A`, and bone tab labels `#E7D7B4`. Dark page stays `#1C1916` with bone ink `#D9CBA8`. Parchment White remains the text on a red fill. Weathered bronze stays a midtone, not small text. The manifest ground stays Iron Black `#111111`. Browser chrome is `#C6B08A` in light and `#1C1916` in dark. The logo files are not given a new field.

Red audit: `button.primary` and `.button.primary` are the red action fill. The journal also uses red for the ribbon, the active tab bar, and a selected chip, still as a fill, rule, or border, never as text. Repeated actions (saving a name, posting a note, raising one ability) use an outline. A page keeps one red action: Join the Company, Sign your papers, Record Work, or Roll.

## Type

`FONT_PAIR` in `src/lib/brand.ts` is the only switch.

Body text is Nunito Sans: weight 300 from 18px up, 400 below that, and 600 for emphasis. Headlines, buttons, labels, and tabs are Bebas Neue, all caps, 2% letter-spacing, line-height 1.1. `--font-display` is `"Bebas Neue", "Arial Narrow", sans-serif`. The Sirath journal uses EB Garamond. Corleone Due is the sign-off only, one short line, never body, buttons, or fact lines. John approved replacing Barlow on 12 Nov 2026. Brand guide v3.2 keeps Bebas Neue for chrome.

EMC holds a FontMesa Corleone license for web and app use. The files are never committed. `@font-face` points at `public/fonts/corleone/Corleone-Regular.woff2` (`font-family: Corleone`) and `public/fonts/corleone/Corleone-Due-Regular.woff2` (`font-family: "Corleone Due"`). Both are weight 400, normal, `font-display: swap`. The sign-off uses Corleone Due, then Corleone, then Nunito Sans. That folder is gitignored. John adds the files at deploy time. A missing file does not fail the build.

League Spartan and Cinzel are not used.

## Logo

John approved the FINAL logo on 13 Nov 2026, brand guide v3.4. The files are committed. None is recolored, filtered, inverted, tinted, or stretched. No CSS filter on the logo. No brown field and no black-and-white-only version. Clear space around a mark is at least a quarter of its height. Screen titles stay live type.

The artwork carries Iron Black `#111111`, Mercenary Red `#B11217` (rays and banner outlines), Banner Tan `#D5B793` (banners), Helmet Bone `#DFD5CC` (helmet), and black lettering. Those two tan and bone values live in the file. They are not new UI tokens.

- `public/brand/EMC_logo_master-app-mark-dark_2026-11-13_FINAL.svg` is the full logo. Use it at about 128px and up: the header, sign-in, About, and the splash.
- `public/brand/EMC_logo_small-mark_2026-11-13_FINAL.svg` is the small mark. Use it under 128px: the favicon, the apple touch icon, the PWA icons, and small in-app marks. `icon-512.png`, `icon-192.png`, `icon-64.png`, `icon-32.png`, `icon-16.png`, the maskable 512, `favicon.png`, the 180 apple touch icon, and `favicon.ico` (32 and 16) are resizes of this file. Corners stay transparent where the source is transparent. Nothing paints a background behind them.
- The apple splash places the full logo on a transparent canvas. Manifest `theme_color` and `background_color` stay `#111111`.

## Icons

Interface icons are the line marks in `src/components/icons.tsx`. Inactive icons are Steel Gray. Active icons are Weathered Bronze. No glow, neon, gold, or cartoon style.

## Voice

A military company. Say recruit, squad, the Company, induction, and ranks. Confident, short, and in-world, and still clear. Lead with the Company. Do not make fun of EMC. Do not invent Toten or Bleakspire lore. The place name is spelled Bleakspire.

Use these lines where they fit:

- A squad, a story, and a reason to keep showing up.
- Join the Company.
- Train. Record. Advance.
- Your week shapes your character and the story.
- Go forth and conquer.

Player-facing copy does not call attribute growth "points," and it does not use video-game framing. Say that the week shapes the character and the story. Staff tools and the database may keep the internal names. In-world notices sit on parchment with iron text. Red is a fill, not text on iron or on parchment.
