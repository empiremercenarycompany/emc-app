export type AbilityName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export const ABILITIES: AbilityName[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export type AbilityScores = Record<AbilityName, number>;

export const BASE_SCORES: AbilityScores = {
  strength: 8,
  dexterity: 8,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
};

/**
 * Legal recruit arrays. Both cost 3 of the 27-point build.
 * - four 8s, one 9, one 10 (+2/+1)
 * - three 8s and three 9s (+1/+1/+1)
 * The raised scores may sit on any abilities.
 */
export function isValidStartingArray(scores: AbilityScores): boolean {
  const counts = new Map<number, number>();
  for (const ability of ABILITIES) {
    const score = scores[ability];
    counts.set(score, (counts.get(score) ?? 0) + 1);
  }
  const eight = counts.get(8) ?? 0;
  const nine = counts.get(9) ?? 0;
  const ten = counts.get(10) ?? 0;
  const other = [...counts.keys()].some((score) => score !== 8 && score !== 9 && score !== 10);
  if (other) return false;
  const tenAndNine = eight === 4 && nine === 1 && ten === 1;
  const threeNines = eight === 3 && nine === 3 && ten === 0;
  return tenAndNine || threeNines;
}

export function scoresFromBonuses(
  mode: "plus2" | "plus1",
  raised: AbilityName[],
): AbilityScores {
  const scores = { ...BASE_SCORES };
  if (mode === "plus2") {
    if (raised.length !== 2 || raised[0] === raised[1]) {
      return scores;
    }
    scores[raised[0]] = 10;
    scores[raised[1]] = 9;
    return scores;
  }
  if (new Set(raised).size !== 3 || raised.length !== 3) return scores;
  for (const ability of raised) scores[ability] = 9;
  return scores;
}
