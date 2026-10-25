/**
 * One switch for the heading face and the body face.
 * John has not chosen. The default body is League Spartan.
 * Corleone is the display face associated with that pair and is never committed.
 * The other value loads Cinzel for headings and Lato for body.
 */
export const FONT_PAIR = "spartan" as "spartan" | "cinzel";

export const FONT_PAIRS = {
  spartan: {
    body: "League Spartan",
    heading: "League Spartan",
    intendedHeading: "Corleone",
  },
  cinzel: {
    body: "Lato",
    heading: "Cinzel",
    intendedHeading: "Cinzel",
  },
} as const;
