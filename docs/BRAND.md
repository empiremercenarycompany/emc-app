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

The approved visual direction warms how those colors are used. It does not add a brand color and it does not recolor the logo. The page ground is warm charcoal `#1A1613`, with raised charcoal `#241E19` for cards. Documents (the character sheet, notices, Recruitment Papers, Codex entries) sit on parchment with ink `#211B15`. Bronze light `#D2B07A` is for small labels on charcoal. Bronze dark `#6B4F27` is for small labels on parchment. Weathered bronze stays a midtone, not small text. Red stays a fill on a primary action. The app icon, splash, and manifest ground stay Iron Black `#111111` so the mark is unchanged. The browser chrome uses charcoal so it matches the page.

Red audit: the only red fill is `button.primary` and `.button.primary` in `src/app/globals.css`. Repeated actions (saving a name, posting a note, raising one ability) use a steel outline. A page keeps one red action: Join the Company, Sign your papers, Record Work, or Roll.

## Type

`FONT_PAIR` in `src/lib/brand.ts` is the only switch.

Body and help text are Barlow 400/500. Labels, buttons, tabs, and stat names are Barlow Condensed 600–700, uppercase. Screen titles and the wordmark use `--font-display: Corleone, var(--font-barlow-condensed), "Barlow Condensed", sans-serif` at weight 800, uppercase, and only for those short lines. The loaded face is in that stack, so a missing file still renders Barlow Condensed 800.

EMC holds a FontMesa Corleone license for web and app use. The files are never committed. `@font-face` points at `public/fonts/corleone/Corleone-Regular.woff2` (`font-family: Corleone`) and `public/fonts/corleone/Corleone-Due-Regular.woff2` (`font-family: "Corleone Due"`). Both are weight 400, normal, `font-display: swap`. All-caps headings use Corleone Due, then Corleone, then Barlow Condensed, then system sans. Corleone Regular is for mixed-case display only. Headings use weight 400 once a Corleone face loads, with `font-synthesis: none`, so the browser does not faux-bold it. Until then they stay weight 800 so the Barlow Condensed fallback is the real 800. That folder is gitignored. John adds the files at deploy time. A missing file does not fail the build.

League Spartan and Cinzel are not used.

## Logo

John approved logo set v2. The files are committed. None is recolored, stretched, or given a glow. Clear space around a mark is at least a quarter of its height. Screen titles are live type. The wide lockup is not used, because its wordmark is baked in Barlow Condensed.

- `public/brand/emc_mark.png` is the transparent helm and kettlebell. It is the header, the sign-in screen, and About.
- `public/brand/emc_app_icon.png` is that mark on Iron Black `#111111`, with about 12% padding, at 1024. The PWA icons (192, 512, and a maskable 512), the 180 apple touch icon, the 32 and 16 favicon, and the splash are resizes of this file. Theme color and splash ground stay `#111111`.
- `public/brand/emc_badge_light.png` is the full badge on parchment. It is for a light surface. The app screens are Iron Black, so they use the transparent mark.

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
