import { pointBuyCost } from "./point-buy";
import { ABILITIES, type AbilityName, type AbilityScores } from "./starting-array";
import { POOL_FOR_ABILITY, type PoolBalances, type PoolName } from "./pools";

export type AffordableIncrease = {
  ability: AbilityName;
  from: number;
  to: number;
  cost: number;
  pool: PoolName;
};

export function affordableIncreases(scores: AbilityScores, pools: PoolBalances): AffordableIncrease[] {
  const increases: AffordableIncrease[] = [];
  for (const ability of ABILITIES) {
    const from = scores[ability];
    const to = from + 1;
    const fromCost = pointBuyCost(from);
    const toCost = pointBuyCost(to);
    if (fromCost == null || toCost == null) continue;
    const cost = toCost - fromCost;
    const pool = POOL_FOR_ABILITY[ability];
    if (pools[pool] >= cost) {
      increases.push({ ability, from, to, cost, pool });
    } else if (pools.free >= cost) {
      increases.push({ ability, from, to, cost, pool: "free" });
    }
  }
  return increases;
}

export function buildTotal(scores: AbilityScores, pools: PoolBalances): number {
  const spent = ABILITIES.reduce((sum, ability) => sum + (pointBuyCost(scores[ability]) ?? 0), 0);
  return spent + pools.physical + pools.constitution + pools.mental + pools.social + pools.free;
}
