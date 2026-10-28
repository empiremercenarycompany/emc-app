import { pointBuyCost } from "./point-buy";
import { ABILITIES, type AbilityName, type AbilityScores } from "./starting-array";

export const POOLS = ["physical", "constitution", "mental", "social", "free"] as const;
export type PoolName = (typeof POOLS)[number];

export type PoolBalances = Record<PoolName, number>;

export const ABILITIES_BY_POOL: Record<PoolName, AbilityName[]> = {
  physical: ["strength", "dexterity"],
  constitution: ["constitution"],
  mental: ["intelligence", "wisdom"],
  social: ["charisma"],
  free: [],
};

export const POOL_FOR_ABILITY: Record<AbilityName, PoolName> = {
  strength: "physical",
  dexterity: "physical",
  constitution: "constitution",
  intelligence: "mental",
  wisdom: "mental",
  charisma: "social",
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
  social: 0,
  free: 0,
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
  const deltas: PoolBalances = { physical: 0, constitution: 0, mental: 0, social: 0, free: 0 };

  for (const ability of ABILITIES) {
    const oldCost = pointBuyCost(input.from[ability]);
    const newCost = pointBuyCost(input.to[ability]);
    if (oldCost == null || newCost == null) {
      return { ok: false, rejection: "scoreOutOfRange" };
    }
    const pool = POOL_FOR_ABILITY[ability];
    deltas[pool] += newCost - oldCost;
  }

  const poolsAfter: PoolBalances = { ...input.pools, free: input.pools.free };
  let freeNeed = 0;
  for (const pool of ["physical", "constitution", "mental", "social"] as const) {
    const balance = input.pools[pool] - deltas[pool];
    if (balance < 0) {
      freeNeed += -balance;
      poolsAfter[pool] = 0;
    } else {
      poolsAfter[pool] = balance;
    }
  }
  if (input.pools.free < freeNeed) return { ok: false, rejection: "insufficientPoints" };
  poolsAfter.free = input.pools.free - freeNeed;
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
