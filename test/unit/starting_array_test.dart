import 'package:emc_app/core/utils/starting_array.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  bool valid(List<int> scores) {
    return StartingArray.isValid(
      strength: scores[0],
      dexterity: scores[1],
      constitution: scores[2],
      intelligence: scores[3],
      wisdom: scores[4],
      charisma: scores[5],
    );
  }

  test('accepts the creator presets', () {
    expect(valid([10, 9, 8, 8, 8, 8]), isTrue);
    expect(valid([9, 9, 9, 8, 8, 8]), isTrue);
  });

  test('accepts every placement of one 10, one 9, and four 8s', () {
    final seen = <String>{};
    for (var ten = 0; ten < 6; ten++) {
      for (var nine = 0; nine < 6; nine++) {
        if (ten == nine) continue;
        final scores = List<int>.filled(6, 8);
        scores[ten] = 10;
        scores[nine] = 9;
        expect(valid(scores), isTrue, reason: '$scores');
        seen.add(scores.join(','));
      }
    }
    expect(seen, hasLength(30));
  });

  test('accepts every placement of three 9s and three 8s', () {
    final seen = <String>{};
    for (var a = 0; a < 6; a++) {
      for (var b = a + 1; b < 6; b++) {
        for (var c = b + 1; c < 6; c++) {
          final scores = List<int>.filled(6, 8);
          scores[a] = 9;
          scores[b] = 9;
          scores[c] = 9;
          expect(valid(scores), isTrue, reason: '$scores');
          seen.add(scores.join(','));
        }
      }
    }
    expect(seen, hasLength(20));
  });

  test('rejects arrays that are not a starting spread', () {
    expect(valid([8, 8, 8, 8, 8, 8]), isFalse);
    expect(valid([10, 8, 8, 8, 8, 8]), isFalse);
    expect(valid([9, 9, 8, 8, 8, 8]), isFalse);
    expect(valid([10, 10, 8, 8, 8, 8]), isFalse);
    expect(valid([10, 9, 9, 8, 8, 8]), isFalse);
    expect(valid([9, 9, 9, 9, 8, 8]), isFalse);
    expect(valid([15, 14, 13, 12, 10, 8]), isFalse);
    expect(valid([10, 9, 8, 8, 8, 7]), isFalse);
    expect(valid([11, 9, 8, 8, 8, 8]), isFalse);
  });
}
