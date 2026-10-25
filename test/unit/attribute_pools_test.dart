import 'package:emc_app/core/utils/attribute_pools.dart';
import 'package:emc_app/core/utils/point_buy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const base = AbilityScores(
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
  );

  test('maps each ability to its source pool', () {
    expect(AttributePools.poolOf('strength'), AttributePools.physical);
    expect(AttributePools.poolOf('dexterity'), AttributePools.physical);
    expect(AttributePools.poolOf('constitution'), AttributePools.constitution);
    expect(AttributePools.poolOf('intelligence'), AttributePools.mental);
    expect(AttributePools.poolOf('wisdom'), AttributePools.mental);
    expect(AttributePools.poolOf('charisma'), AttributePools.mental);
    expect(
      AttributePools.abilities[AttributePools.physical],
      ['strength', 'dexterity'],
    );
    expect(
      AttributePools.abilities[AttributePools.constitution],
      ['constitution'],
    );
    expect(
      AttributePools.abilities[AttributePools.mental],
      ['intelligence', 'wisdom', 'charisma'],
    );
  });

  test('Physical points raise Strength and refund to Physical', () {
    const pools = PoolBalances(physical: 2, constitution: 0, mental: 0);
    final up = AttributeSpend.step(
      scores: base,
      pools: pools,
      ability: 'strength',
      delta: 1,
    );
    expect(up, isNotNull);
    expect(up!.scores.strength, 9);
    expect(up.pools.physical, 1);
    expect(up.costDelta, PointBuy.costFor(9) - PointBuy.costFor(8));

    final back = AttributeSpend.step(
      scores: up.scores,
      pools: up.pools,
      ability: 'strength',
      delta: -1,
    );
    expect(back!.scores.strength, 8);
    expect(back.pools.physical, 2);
    expect(back.pools.constitution, 0);
    expect(back.pools.mental, 0);
  });

  test('a pool cannot pay for another pool\'s ability', () {
    const pools = PoolBalances(physical: 9, constitution: 0, mental: 0);
    expect(
      AttributeSpend.step(
        scores: base,
        pools: pools,
        ability: 'constitution',
        delta: 1,
      ),
      isNull,
    );
    expect(
      AttributeSpend.step(
        scores: base,
        pools: pools,
        ability: 'wisdom',
        delta: 1,
      ),
      isNull,
    );

    final check = AttributeSpend.check(
      from: base,
      to: base.copyWithAbility('constitution', 9),
      pools: pools,
    );
    expect(check.rejection, SpendRejection.insufficientPoints);
  });

  test('Constitution and Mental spend only their own abilities', () {
    const pools = PoolBalances(physical: 0, constitution: 1, mental: 2);
    final con = AttributeSpend.step(
      scores: base,
      pools: pools,
      ability: 'constitution',
      delta: 1,
    );
    expect(con!.pools.constitution, 0);
    expect(con.pools.mental, 2);

    final wis = AttributeSpend.step(
      scores: base,
      pools: pools,
      ability: 'wisdom',
      delta: 1,
    );
    expect(wis!.scores.wisdom, 9);
    expect(wis.pools.mental, 1);
    expect(wis.pools.constitution, 1);
  });

  test('scores cannot leave 8 through 15, and an empty pool cannot buy', () {
    expect(
      AttributeSpend.step(
        scores: base,
        pools: const PoolBalances(physical: 5, constitution: 0, mental: 0),
        ability: 'strength',
        delta: -1,
      ),
      isNull,
    );

    const atCap = AbilityScores(
      strength: 15,
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8,
    );
    expect(
      AttributeSpend.step(
        scores: atCap,
        pools: const PoolBalances(physical: 20, constitution: 0, mental: 0),
        ability: 'strength',
        delta: 1,
      ),
      isNull,
    );
    expect(
      AttributeSpend.step(
        scores: base,
        pools: const PoolBalances(physical: 0, constitution: 0, mental: 0),
        ability: 'dexterity',
        delta: 1,
      ),
      isNull,
    );
  });

  test('a full save nets purchases and refunds inside each pool', () {
    const from = AbilityScores(
      strength: 10,
      dexterity: 9,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8,
    );
    const pools = PoolBalances(physical: 0, constitution: 0, mental: 0);
    // Drop STR from 10 to 8 (refund 2) and raise DEX from 9 to 10 (spend 1).
    // Net refund to Physical is 1. No other pool moves.
    final to =
        from.copyWithAbility('strength', 8).copyWithAbility('dexterity', 10);
    final check = AttributeSpend.check(from: from, to: to, pools: pools);
    expect(check.isValid, isTrue);
    expect(check.poolsAfter!.physical, 1);
    expect(check.poolsAfter!.constitution, 0);
    expect(check.poolsAfter!.mental, 0);
  });

  test('a full save rejects a score off the point-buy table', () {
    final check = AttributeSpend.check(
      from: base,
      to: base.copyWithAbility('strength', 16),
      pools: const PoolBalances(physical: 30, constitution: 0, mental: 0),
    );
    expect(check.rejection, SpendRejection.scoreOutOfRange);
  });

  test('raising Strength and Dexterity draws from the same Physical balance',
      () {
    const pools = PoolBalances(physical: 3, constitution: 0, mental: 0);
    final to =
        base.copyWithAbility('strength', 10).copyWithAbility('dexterity', 9);
    final check = AttributeSpend.check(from: base, to: to, pools: pools);
    // 8 -> 10 costs 2, 8 -> 9 costs 1, total 3.
    expect(check.isValid, isTrue);
    expect(check.poolsAfter!.physical, 0);

    final short = AttributeSpend.check(
      from: base,
      to: to,
      pools: const PoolBalances(physical: 2, constitution: 0, mental: 0),
    );
    expect(short.rejection, SpendRejection.insufficientPoints);
  });
}
