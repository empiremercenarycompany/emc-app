/// Locked recruit starting arrays.
///
/// A legal spread is one of:
/// - four 8s, one 9, and one 10
/// - three 8s and three 9s
///
/// The raised scores may sit on any abilities. Both spreads cost 3 points
/// on the 5.5e table in point_buy.dart. The database function
/// `create_character` checks the same 50 placements.
class StartingArray {
  static bool isValid({
    required int strength,
    required int dexterity,
    required int constitution,
    required int intelligence,
    required int wisdom,
    required int charisma,
  }) {
    final counts = <int, int>{};
    for (final score in [
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
    ]) {
      counts[score] = (counts[score] ?? 0) + 1;
    }

    final tenAndNine = counts.length == 3 &&
        counts[8] == 4 &&
        counts[9] == 1 &&
        counts[10] == 1;
    final threeNines = counts.length == 2 && counts[8] == 3 && counts[9] == 3;
    return tenAndNine || threeNines;
  }
}
