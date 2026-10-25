class PointBuy {
  // Standard D&D 5.5e point-buy costs (score -> cost)
  static const Map<int, int> costs = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
  };

  static int costFor(int score) => costs[score] ?? 0;

  static int totalCost({
    required int strength,
    required int dexterity,
    required int constitution,
    required int intelligence,
    required int wisdom,
    required int charisma,
  }) {
    return costFor(strength) +
        costFor(dexterity) +
        costFor(constitution) +
        costFor(intelligence) +
        costFor(wisdom) +
        costFor(charisma);
  }
}
