/**
 * Level 0 species traits, names only. No rules text.
 * Ability score increases come from the background for every species.
 * Human Skillful is also a proficiency choice in resolve_creation_grants.
 * Elf Keen Senses is the Insight, Perception, or Survival choice there.
 * Versatile, the extra human origin feat, is not a trait this build grants.
 * Lineage options (which elf, gnome, dragon, giant, or legacy) are not chosen
 * at level 0. The lineage trait is recorded by name.
 */

export type SpeciesTrait = { id: string; name: string };

const TRAITS: Record<string, SpeciesTrait[]> = {
  human: [
    { id: "resourceful", name: "Resourceful" },
    { id: "skillful", name: "Skillful" },
  ],
  dwarf: [
    { id: "darkvision", name: "Darkvision" },
    { id: "dwarven_resilience", name: "Dwarven Resilience" },
    { id: "dwarven_toughness", name: "Dwarven Toughness" },
    { id: "stonecunning", name: "Stonecunning" },
  ],
  elf: [
    { id: "darkvision", name: "Darkvision" },
    { id: "elven_lineage", name: "Elven Lineage" },
    { id: "fey_ancestry", name: "Fey Ancestry" },
    { id: "keen_senses", name: "Keen Senses" },
    { id: "trance", name: "Trance" },
  ],
  gnome: [
    { id: "darkvision", name: "Darkvision" },
    { id: "gnomish_cunning", name: "Gnomish Cunning" },
    { id: "gnomish_lineage", name: "Gnomish Lineage" },
  ],
  halfling: [
    { id: "brave", name: "Brave" },
    { id: "halfling_nimbleness", name: "Halfling Nimbleness" },
    { id: "luck", name: "Luck" },
    { id: "naturally_stealthy", name: "Naturally Stealthy" },
  ],
  dragonborn: [
    { id: "draconic_ancestry", name: "Draconic Ancestry" },
    { id: "breath_weapon", name: "Breath Weapon" },
    { id: "damage_resistance", name: "Damage Resistance" },
    { id: "darkvision", name: "Darkvision" },
  ],
  goliath: [
    { id: "giant_ancestry", name: "Giant Ancestry" },
    { id: "large_form", name: "Large Form" },
    { id: "powerful_build", name: "Powerful Build" },
  ],
  orc: [
    { id: "adrenaline_rush", name: "Adrenaline Rush" },
    { id: "darkvision", name: "Darkvision" },
    { id: "relentless_endurance", name: "Relentless Endurance" },
  ],
  tiefling: [
    { id: "darkvision", name: "Darkvision" },
    { id: "fiendish_legacy", name: "Fiendish Legacy" },
    { id: "otherworldly_presence", name: "Otherworldly Presence" },
  ],
  aasimar: [
    { id: "celestial_resistance", name: "Celestial Resistance" },
    { id: "darkvision", name: "Darkvision" },
    { id: "healing_hands", name: "Healing Hands" },
    { id: "light_bearer", name: "Light Bearer" },
    { id: "celestial_revelation", name: "Celestial Revelation" },
  ],
};

export function level0SpeciesTraits(speciesId: string | null | undefined): SpeciesTrait[] {
  if (!speciesId) return [];
  return TRAITS[speciesId] ?? [];
}

export function level0SpeciesTraitLine(speciesId: string | null | undefined): string {
  return level0SpeciesTraits(speciesId)
    .map((trait) => trait.name)
    .join(", ");
}
