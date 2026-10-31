/** One plain line each. Names stay in the species table. No rules text. */
export const SPECIES_BLURB: Record<string, string> = {
  aasimar: "A people with a bright lineage.",
  dragonborn: "A scaled people with a strong breath.",
  dwarf: "A sturdy people, hard to move and slow to tire.",
  elf: "A keen people, quick of eye and light on their feet.",
  gnome: "A small people, clever with their hands.",
  goliath: "A tall people, built for height and heavy loads.",
  halfling: "A small people, quick to slip past trouble.",
  human: "People of every trade, ready to learn what the week asks.",
  orc: "A people known for drive and stamina.",
  tiefling: "A people marked by an unusual lineage.",
};

export function speciesBlurb(id: string): string {
  return SPECIES_BLURB[id] ?? "A people the Company can play.";
}

/** Used when the species table has not loaded, so the papers can still be read. */
export const SPECIES_FALLBACK = [
  { id: "human", name: "Human" },
  { id: "dwarf", name: "Dwarf" },
  { id: "elf", name: "Elf" },
  { id: "gnome", name: "Gnome" },
  { id: "halfling", name: "Halfling" },
  { id: "orc", name: "Orc" },
  { id: "dragonborn", name: "Dragonborn" },
  { id: "goliath", name: "Goliath" },
  { id: "aasimar", name: "Aasimar" },
  { id: "tiefling", name: "Tiefling" },
] as const;
