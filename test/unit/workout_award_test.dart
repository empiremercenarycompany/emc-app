import 'package:emc_app/core/utils/attribute_pools.dart';
import 'package:emc_app/core/utils/workout_awards.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('placeholder numbers are the weekly config John still has to set', () {
    expect(WorkoutAwardRule.pointsPerLog, 1);
    expect(WorkoutAwardRule.weeklyCap, 5);
    expect(WorkoutAwardRule.weeklyTarget, 3);
    expect(WorkoutAwardRule.weeklyTargetBonus, 1);
    expect(WorkoutAwardRule.pool, AttributePools.physical);
    expect(WorkoutAwardRule.source, 'workout');
    expect(
      WorkoutAwardRule.weeklyTarget,
      lessThanOrEqualTo(WorkoutAwardRule.weeklyCap),
    );
  });

  test('the week starts Monday UTC and includes the following Sunday', () {
    expect(
      WorkoutAwardRule.weekStartUtc(DateTime.utc(2026, 10, 19)),
      DateTime.utc(2026, 10, 19),
    );
    expect(
      WorkoutAwardRule.weekStartUtc(DateTime.utc(2026, 10, 25)),
      DateTime.utc(2026, 10, 19),
    );
    expect(
      WorkoutAwardRule.weekStartUtc(DateTime.utc(2026, 10, 26)),
      DateTime.utc(2026, 10, 26),
    );
  });

  test('a Thursday in a new year stays in the Monday that fell in December',
      () {
    expect(
      WorkoutAwardRule.weekStartUtc(DateTime.utc(2026, 1, 1)),
      DateTime.utc(2025, 12, 29),
    );
    expect(
      WorkoutAwardRule.weekStartUtc(DateTime.utc(2026, 1, 4)),
      DateTime.utc(2025, 12, 29),
    );
    expect(
      WorkoutAwardRule.weekStartUtc(DateTime.utc(2026, 1, 5)),
      DateTime.utc(2026, 1, 5),
    );
  });

  test('a local DateTime is rejected so the week cannot follow device time',
      () {
    expect(
      () => WorkoutAwardRule.weekStartUtc(DateTime(2026, 10, 25)),
      throwsArgumentError,
    );
  });

  test('two logs on the same day both earn a point', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-1',
        alreadyAwardedLogIds: {},
        awardedLogsThisWeek: 0,
      ),
      1,
    );
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-2',
        alreadyAwardedLogIds: {'log-1'},
        awardedLogsThisWeek: 1,
      ),
      1,
    );
  });

  test('the target log earns the frequency bonus once', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-3',
        alreadyAwardedLogIds: {'log-1', 'log-2'},
        awardedLogsThisWeek: 2,
      ),
      WorkoutAwardRule.pointsPerLog + WorkoutAwardRule.weeklyTargetBonus,
    );
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-4',
        alreadyAwardedLogIds: {'log-1', 'log-2', 'log-3'},
        awardedLogsThisWeek: 3,
      ),
      WorkoutAwardRule.pointsPerLog,
    );
  });

  test('awarding the same log again adds nothing', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-3',
        alreadyAwardedLogIds: {'log-3'},
        awardedLogsThisWeek: 2,
      ),
      0,
    );
  });

  test('the cap stops later awards and never returns a negative amount', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-6',
        alreadyAwardedLogIds: {'log-1', 'log-2', 'log-3', 'log-4', 'log-5'},
        awardedLogsThisWeek: WorkoutAwardRule.weeklyCap,
      ),
      0,
    );
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-7',
        alreadyAwardedLogIds: {},
        awardedLogsThisWeek: WorkoutAwardRule.weeklyCap + 3,
      ),
      0,
    );
  });

  test('a new week starts the count over', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'next-week',
        alreadyAwardedLogIds: {'log-1', 'log-2', 'log-3', 'log-4', 'log-5'},
        awardedLogsThisWeek: 0,
      ),
      WorkoutAwardRule.pointsPerLog,
    );
  });
}
