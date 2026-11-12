# Private font

FontMesa Corleone is licensed for web and app use. Do not commit the files.

Put these two woff2 files in `public/fonts/corleone/`. That folder is gitignored. John adds them at deploy time.

| File | CSS `font-family` | Use |
| --- | --- | --- |
| `Corleone-Regular.woff2` | `Corleone` | Mixed-case display only. Weight 400 |
| `Corleone-Due-Regular.woff2` | `Corleone Due` | All-caps headings. Weight 400 |

`@font-face` uses `font-display: swap`. The display stack is `"Corleone Due", Corleone, "Nunito Sans", sans-serif`. If a file is missing, the build still succeeds and headings use Nunito Sans, then the system sans. A loaded Corleone face is drawn at weight 400 with `font-synthesis: none`.

Nunito Sans loads through `next/font/google` for body, labels, and buttons. The Sirath journal also loads EB Garamond.
