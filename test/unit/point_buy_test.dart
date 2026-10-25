import 'package:emc_app/core/utils/point_buy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('uses the locked 5.5e point-buy costs', () {
    expect(PointBuy.costs, {
      8: 0,
      9: 1,
      10: 2,
      11: 3,
      12: 4,
      13: 5,
      14: 7,
      15: 9,
    });
  });

  test('costFor matches the table for every legal score', () {
    for (final entry in PointBuy.costs.entries) {
      expect(PointBuy.costFor(entry.key), entry.value);
    }
  });

  test('both starting arrays cost three points', () {
    expect(
      PointBuy.totalCost(
        strength: 10,
        dexterity: 9,
        constitution: 8,
        intelligence: 8,
        wisdom: 8,
        charisma: 8,
      ),
      3,
    );
    expect(
      PointBuy.totalCost(
        strength: 9,
        dexterity: 9,
        constitution: 9,
        intelligence: 8,
        wisdom: 8,
        charisma: 8,
      ),
      3,
    );
  });

  test('the classic 27-point spread sums to 27', () {
    expect(
      PointBuy.totalCost(
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
      ),
      27,
    );
  });

  test('raising a score charges the difference in cost', () {
    expect(PointBuy.costFor(14) - PointBuy.costFor(13), 2);
    expect(PointBuy.costFor(15) - PointBuy.costFor(14), 2);
    expect(PointBuy.costFor(9) - PointBuy.costFor(8), 1);
  });
}
