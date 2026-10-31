/**
 * 5.5e / PHB point-buy costs. Scores above the table are refused until John
 * adds a cost. TODO(John): confirm whether scores can be bought above 15.
 */
export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export function pointBuyCost(score: number): number | null {
  return Object.prototype.hasOwnProperty.call(POINT_BUY_COSTS, score)
    ? POINT_BUY_COSTS[score]
    : null;
}

export function totalPointBuyCost(scores: number[]): number {
  return scores.reduce((sum, score) => {
    const cost = pointBuyCost(score);
    if (cost == null) {
      throw new Error(`Score ${score} is not on the point-buy table`);
    }
    return sum + cost;
  }, 0);
}
