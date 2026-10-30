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

Red audit: the only red fill is `button.primary` and `.button.primary` in `src/app/globals.css`. Repeated actions (saving a name, posting a note, raising one ability) use a steel outline. A page keeps one red action: Join the Company, the Recruit Oath, Record Work, or Roll.

## Type

`FONT_PAIR` in `src/lib/brand.ts` is the only switch.

- `barlow` (default). Body and UI text are Barlow Regular, from Google Fonts, SIL Open Font License. Subheads, buttons, labels, and tabs are Barlow Condensed. Big titles (screen titles, rank and induction titles) are Barlow Condensed too.
- `corleone`. Same Barlow pair, except those big titles use Corleone when `public/brand/local/Corleone.woff2` is on disk. If that file is missing, titles stay Barlow Condensed. The `@font-face` is not emitted unless the file is there.

League Spartan is not used. Never commit Corleone font files. The license is unconfirmed.

## Logo

Two marks are committed. Neither is recolored, stretched, or given a glow. Clear space around each is at least a quarter of its height.

- `public/brand/logo_dark.png` is the full badge on black, 800×800. It is the dark splash (Join the Company) and the About screen.
- `public/brand/emc_logo.png` is the same badge with a transparent ground, white and red. It is for dark backgrounds only, including the slot at the top of the book.
- A light screen does not get its own logo. The dark mark is shown on an Iron Black panel. No light-background file is made, and nothing is recolored.

The working PWA and app icon is the helm crop `public/brand/emc_mark_helm_square.png` (1024, already on `#111111`). Smaller icon files are downscales of that crop. The full badge is not scaled up into an icon. `public/brand/emc_mark_helm_square_transparent.png` is the same crop with a clear ground. John has not approved the crop as the icon yet.

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
