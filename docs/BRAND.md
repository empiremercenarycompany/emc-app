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

`FONT_PAIR` in `src/lib/brand.ts` is the only switch. It sets both the heading face and the body face.

- `spartan` (default). Body is League Spartan, loaded with `next/font/google`. The intended heading is Corleone. That file is not licensed and is not in this repo, so headings use League Spartan too.
- `cinzel`. Headings are Cinzel. Body is Lato. Both load with `next/font/google`.

League Spartan, Cinzel, and Lato are SIL Open Font License. Never commit Corleone font files.

## Logo

No logo file is committed. `LogoSlot` in `src/components/ui.tsx` is the slot (`data-logo-slot="wordmark"`), framed in bronze. The fallback wordmark is `EMPIRE MERCENARY COMPANY`. The PWA icon is a plain letter mark for the home screen, not the company logo.

## Icons

Interface icons are the line marks in `src/components/icons.tsx`. Inactive icons are Steel Gray. Active icons are Weathered Bronze. No glow, neon, gold, or cartoon style.

## Voice

A military company. Say recruit, squad, the Company, induction, and ranks. Confident, short, and in-world, and still clear. Lead with the Company. Do not make fun of EMC. Do not invent Toten or Bleakspire lore. The place name is spelled Bleakspire.

Use these lines where they fit:

- A squad, a story, and a reason to keep showing up.
- Join the Company.
- Train. Record. Advance.

Player-facing copy does not call attribute growth "points." Say that it comes from your workouts and the goals you hit. Staff tools and the database may keep the internal names.
