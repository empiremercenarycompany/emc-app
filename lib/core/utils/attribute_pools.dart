import 'point_buy.dart';

/// The three point pools from the locked rule.
///
/// Physical is earned from workouts and spends on Strength and Dexterity.
/// Constitution is earned from nutrition and sleep and spends on Constitution.
/// Mental is earned from SMART goals and spends on Intelligence, Wisdom, and Charisma.
class AttributePools {
  static const String physical = 'physical';
  static const String constitution = 'constitution';
  static const String mental = 'mental';

  static const List<String> all = [physical, constitution, mental];

  static const Map<String, List<String>> abilities = {
    physical: ['strength', 'dexterity'],
    constitution: ['constitution'],
    mental: ['intelligence', 'wisdom', 'charisma'],
  };

  static const Map<String, String> poolForAbility = {
    'strength': physical,
    'dexterity': physical,
    'constitution': constitution,
    'intelligence': mental,
    'wisdom': mental,
    'charisma': mental,
  };

  static String poolOf(String ability) {
    final pool = poolForAbility[ability];
    if (pool == null) {
      throw ArgumentError('Unknown ability: $ability');
    }
    return pool;
  }
}

class AbilityScores {
  final int strength;
  final int dexterity;
  final int constitution;
  final int intelligence;
  final int wisdom;
  final int charisma;

  const AbilityScores({
    required this.strength,
    required this.dexterity,
    required this.constitution,
    required this.intelligence,
    required this.wisdom,
    required this.charisma,
  });

  int valueOf(String ability) {
    switch (ability) {
      case 'strength':
        return strength;
      case 'dexterity':
        return dexterity;
      case 'constitution':
        return constitution;
      case 'intelligence':
        return intelligence;
      case 'wisdom':
        return wisdom;
      case 'charisma':
        return charisma;
      default:
        throw ArgumentError('Unknown ability: $ability');
    }
  }

  AbilityScores copyWithAbility(String ability, int value) {
    return AbilityScores(
      strength: ability == 'strength' ? value : strength,
      dexterity: ability == 'dexterity' ? value : dexterity,
      constitution: ability == 'constitution' ? value : constitution,
      intelligence: ability == 'intelligence' ? value : intelligence,
      wisdom: ability == 'wisdom' ? value : wisdom,
      charisma: ability == 'charisma' ? value : charisma,
    );
  }
}

class PoolBalances {
  final int physical;
  final int constitution;
  final int mental;

  const PoolBalances({
    required this.physical,
    required this.constitution,
    required this.mental,
  });

  int valueOf(String pool) {
    switch (pool) {
      case AttributePools.physical:
        return physical;
      case AttributePools.constitution:
        return constitution;
      case AttributePools.mental:
        return mental;
      default:
        throw ArgumentError('Unknown pool: $pool');
    }
  }

  PoolBalances copyWithPool(String pool, int value) {
    return PoolBalances(
      physical: pool == AttributePools.physical ? value : physical,
      constitution: pool == AttributePools.constitution ? value : constitution,
      mental: pool == AttributePools.mental ? value : mental,
    );
  }
}

/// Result of trying to move one ability by a single step.
class SpendStep {
  final AbilityScores scores;
  final PoolBalances pools;
  final String pool;
  final int costDelta;

  const SpendStep({
    required this.scores,
    required this.pools,
    required this.pool,
    required this.costDelta,
  });
}

/// Why a proposed spend was rejected. Null means the scores are legal.
enum SpendRejection {
  scoreOutOfRange,
  insufficientPoints,
}

class SpendCheck {
  final SpendRejection? rejection;
  final PoolBalances? poolsAfter;

  const SpendCheck._(this.rejection, this.poolsAfter);

  const SpendCheck.ok(PoolBalances pools) : this._(null, pools);

  const SpendCheck.rejected(SpendRejection rejection) : this._(rejection, null);

  bool get isValid => rejection == null;
}

/// Point-buy spends against the three pools.
///
/// A positive cost takes points from that ability's pool. A negative cost
/// refunds the same pool. Scores stay on the 5.5e table, 8 through 15.
/// One pool cannot pay for another pool's abilities.
class AttributeSpend {
  static const int minScore = 8;
  static const int maxScore = 15;

  /// Moves [ability] by [delta] (+1 or -1) when the matching pool can pay.
  /// Returns null when the step is illegal, leaving the caller unchanged.
  static SpendStep? step({
    required AbilityScores scores,
    required PoolBalances pools,
    required String ability,
    required int delta,
  }) {
    if (!AttributePools.poolForAbility.containsKey(ability)) return null;
    if (delta != 1 && delta != -1) return null;

    final current = scores.valueOf(ability);
    final next = current + delta;
    final currentCost = PointBuy.costs[current];
    final nextCost = PointBuy.costs[next];
    if (currentCost == null || nextCost == null) return null;

    final costDelta = nextCost - currentCost;
    final pool = AttributePools.poolOf(ability);
    final balance = pools.valueOf(pool) - costDelta;
    if (balance < 0) return null;

    return SpendStep(
      scores: scores.copyWithAbility(ability, next),
      pools: pools.copyWithPool(pool, balance),
      pool: pool,
      costDelta: costDelta,
    );
  }

  /// Checks a full proposed array against the pools the character holds now.
  ///
  /// [from] is the saved array. [to] is what the recruit wants to save.
  /// Refunds and purchases in the same pool net out before the balance is checked.
  static SpendCheck check({
    required AbilityScores from,
    required AbilityScores to,
    required PoolBalances pools,
  }) {
    final deltas = <String, int>{
      AttributePools.physical: 0,
      AttributePools.constitution: 0,
      AttributePools.mental: 0,
    };

    for (final ability in AttributePools.poolForAbility.keys) {
      final oldScore = from.valueOf(ability);
      final newScore = to.valueOf(ability);
      final oldCost = PointBuy.costs[oldScore];
      final newCost = PointBuy.costs[newScore];
      if (oldCost == null || newCost == null) {
        return const SpendCheck.rejected(SpendRejection.scoreOutOfRange);
      }
      final pool = AttributePools.poolOf(ability);
      deltas[pool] = deltas[pool]! + (newCost - oldCost);
    }

    var next = pools;
    for (final entry in deltas.entries) {
      final balance = pools.valueOf(entry.key) - entry.value;
      if (balance < 0) {
        return const SpendCheck.rejected(SpendRejection.insufficientPoints);
      }
      next = next.copyWithPool(entry.key, balance);
    }
    return SpendCheck.ok(next);
  }
}
