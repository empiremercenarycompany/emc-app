import { pointBuyCost } from "./point-buy";
import { ABILITIES, type AbilityName, type AbilityScores } from "./starting-array";

export const POOLS = ["physical", "constitution", "mental"] as const;
export type PoolName = (typeof POOLS)[number];

export type PoolBalances = Record<PoolName, number>;

export const ABILITIES_BY_POOL: Record<PoolName, AbilityName[]> = {
  physical: ["strength", "dexterity"],
  constitution: ["constitution"],
  mental: ["intelligence", "wisdom", "charisma"],
};

export const POOL_FOR_ABILITY: Record<AbilityName, PoolName> = {
  strength: "physical",
  dexterity: "physical",
  constitution: "constitution",
  intelligence: "mental",
  wisdom: "mental",
  charisma: "mental",
};

export function poolOf(ability: string): PoolName {
  if (!(ability in POOL_FOR_ABILITY)) {
    throw new Error(`Unknown ability: ${ability}`);
  }
  return POOL_FOR_ABILITY[ability as AbilityName];
}

export const EMPTY_POOLS: PoolBalances = {
  physical: 0,
  constitution: 0,
  mental: 0,
};

export type SpendRejection = "scoreOutOfRange" | "insufficientPoints";

export type SpendCheck =
  | { ok: true; poolsAfter: PoolBalances }
  | { ok: false; rejection: SpendRejection };

/**
 * A pool pays only for its own abilities. Refunds return to that same pool.
 * Purchases and refunds in one pool net out before the balance is checked.
 * Scores stay on the configured point-buy table (8 through 15 until John says otherwise).
 */
export function checkSpend(input: {
  from: AbilityScores;
  to: AbilityScores;
  pools: PoolBalances;
}): SpendCheck {
  const deltas: PoolBalances = { physical: 0, constitution: 0, mental: 0 };

  for (const ability of ABILITIES) {
    const oldCost = pointBuyCost(input.from[ability]);
    const newCost = pointBuyCost(input.to[ability]);
    if (oldCost == null || newCost == null) {
      return { ok: false, rejection: "scoreOutOfRange" };
    }
    const pool = POOL_FOR_ABILITY[ability];
    deltas[pool] += newCost - oldCost;
  }

  const poolsAfter: PoolBalances = { ...input.pools };
  for (const pool of POOLS) {
    const balance = input.pools[pool] - deltas[pool];
    if (balance < 0) return { ok: false, rejection: "insufficientPoints" };
    poolsAfter[pool] = balance;
  }
  return { ok: true, poolsAfter };
}

export function stepScore(input: {
  scores: AbilityScores;
  pools: PoolBalances;
  ability: AbilityName;
  delta: 1 | -1;
}): { scores: AbilityScores; pools: PoolBalances; costDelta: number } | null {
  const next = input.scores[input.ability] + input.delta;
  const to: AbilityScores = { ...input.scores, [input.ability]: next };
  const check = checkSpend({ from: input.scores, to, pools: input.pools });
  if (!check.ok) return null;
  const oldCost = pointBuyCost(input.scores[input.ability]);
  const newCost = pointBuyCost(next);
  if (oldCost == null || newCost == null) return null;
  return { scores: to, pools: check.poolsAfter, costDelta: newCost - oldCost };
}
