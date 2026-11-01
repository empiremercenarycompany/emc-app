# Private font

FontMesa Corleone is licensed for web and app use. Do not commit the files.

Put these two woff2 files in `public/fonts/corleone/`. That folder is gitignored. John adds them at deploy time.

| File | CSS `font-family` | Use |
| --- | --- | --- |
| `Corleone-Regular.woff2` | `Corleone` | Mixed-case display only. Weight 400 |
| `Corleone-Due-Regular.woff2` | `Corleone Due` | All-caps headings. Weight 400 |

`@font-face` uses `font-display: swap`. The display stack is `"Corleone Due", Corleone, "Barlow Condensed", sans-serif`. If a file is missing, the build still succeeds and headings use Barlow Condensed 800, then the system sans. A loaded Corleone face is drawn at weight 400 with `font-synthesis: none`.

Barlow (body) and Barlow Condensed (labels and buttons) load through `next/font/google`.
