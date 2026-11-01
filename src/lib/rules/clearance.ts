/** Civic Clearance. Week thresholds stay as John set them. */
export const CLEARANCE_LADDER = [
  { week: 4, name: "Known" },
  { week: 10, name: "Trusted" },
  { week: 20, name: "Vouched For" },
  { week: 36, name: "Honoured" },
  { week: 52, name: "Esteemed of Bleakspire" },
] as const;

export const PILLAR_NAME = "Pillar of Bleakspire";
export const PILLAR_INTERVAL = 26;

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function romanNumeral(value: number): string {
  let rest = value;
  let out = "";
  for (const [amount, glyph] of ROMAN) {
    while (rest >= amount) {
      out += glyph;
      rest -= amount;
    }
  }
  return out;
}

/**
 * The honor for a company week. Null before week 4.
 * The first Pillar is unnumbered. Repeats are II, III, and on.
 */
export function clearanceRank(week: number | null): string | null {
  if (week == null || week < CLEARANCE_LADDER[0].week) return null;
  const pillarWeek = CLEARANCE_LADDER[CLEARANCE_LADDER.length - 1].week + PILLAR_INTERVAL;
  if (week >= pillarWeek) {
    const repeat = Math.floor((week - CLEARANCE_LADDER[CLEARANCE_LADDER.length - 1].week) / PILLAR_INTERVAL);
    if (repeat <= 1) return PILLAR_NAME;
    return `${PILLAR_NAME} ${romanNumeral(repeat)}`;
  }
  let name: string = CLEARANCE_LADDER[0].name;
  for (const tier of CLEARANCE_LADDER) {
    if (week >= tier.week) name = tier.name;
  }
  return name;
}
