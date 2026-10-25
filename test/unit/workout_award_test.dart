import 'package:emc_app/core/utils/attribute_pools.dart';
import 'package:emc_app/core/utils/workout_awards.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final today = DateTime.utc(2026, 10, 25);

  setUpAll(WorkoutAwardRule.ensureTimeZones);

  test('placeholder config uses Denver time and a 14-day backfill', () {
    expect(WorkoutAwardRule.pointsPerLog, 1);
    expect(WorkoutAwardRule.weeklyCap, 5);
    expect(WorkoutAwardRule.weeklyTarget, 3);
    expect(WorkoutAwardRule.weeklyTargetBonus, 1);
    expect(WorkoutAwardRule.timeZone, 'America/Denver');
    expect(WorkoutAwardRule.backfillDays, 14);
    expect(WorkoutAwardRule.pool, AttributePools.physical);
    expect(WorkoutAwardRule.source, 'workout');
    expect(
      WorkoutAwardRule.weeklyTarget,
      lessThanOrEqualTo(WorkoutAwardRule.weeklyCap),
    );
  });

  test(
      'Monday through Sunday in Denver share one week, and Monday starts the next',
      () {
    expect(
      WorkoutAwardRule.weekStart(DateTime.utc(2026, 10, 19)),
      DateTime.utc(2026, 10, 19),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 10, 25, 18)),
      DateTime.utc(2026, 10, 19),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 10, 26, 6)),
      DateTime.utc(2026, 10, 26),
    );
  });

  test('just before Denver midnight is still the previous week', () {
    // 2026-10-26 05:30 UTC is 23:30 MDT on Sunday 2026-10-25.
    // The UTC date is already Monday, which would be a different week.
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 10, 26, 5, 30)),
      DateTime.utc(2026, 10, 25),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 10, 26, 5, 30)),
      DateTime.utc(2026, 10, 19),
    );
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 10, 26, 6)),
      DateTime.utc(2026, 10, 26),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 10, 26, 6)),
      DateTime.utc(2026, 10, 26),
    );
  });

  test('the zone argument changes the calendar date for the same instant', () {
    final instant = DateTime.utc(2026, 10, 26, 5, 30);
    expect(
      WorkoutAwardRule.calendarDate(instant, zone: 'America/New_York'),
      DateTime.utc(2026, 10, 26),
    );
    expect(
      WorkoutAwardRule.calendarDate(instant),
      DateTime.utc(2026, 10, 25),
    );
  });

  test('spring forward keeps the calendar date and the Monday', () {
    // 2026-03-08 is the second Sunday. 08:30 UTC is 01:30 MST, before the jump.
    // 09:30 UTC is 03:30 MDT, after the jump. Both are still March 8.
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 3, 8, 8, 30)),
      DateTime.utc(2026, 3, 8),
    );
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 3, 8, 9, 30)),
      DateTime.utc(2026, 3, 8),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 3, 8, 9, 30)),
      DateTime.utc(2026, 3, 2),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 3, 9, 6)),
      DateTime.utc(2026, 3, 9),
    );
  });

  test('fall back repeats an hour without changing the date or the week', () {
    // 2026-11-01 is the first Sunday. 07:30 UTC is the first 01:30 MDT.
    // 08:30 UTC is the second 01:30 MST. Both are November 1.
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 11, 1, 7, 30)),
      DateTime.utc(2026, 11, 1),
    );
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 11, 1, 8, 30)),
      DateTime.utc(2026, 11, 1),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 11, 1, 8, 30)),
      DateTime.utc(2026, 10, 26),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 11, 2, 7)),
      DateTime.utc(2026, 11, 2),
    );
  });

  test('a Denver new year stays in the December week until Monday', () {
    // 2026-01-01 06:30 UTC is 23:30 MST on 2025-12-31.
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 1, 1, 6, 30)),
      DateTime.utc(2025, 12, 31),
    );
    expect(
      WorkoutAwardRule.weekStartOf(DateTime.utc(2026, 1, 1, 6, 30)),
      DateTime.utc(2025, 12, 29),
    );
    expect(
      WorkoutAwardRule.calendarDate(DateTime.utc(2026, 1, 1, 7)),
      DateTime.utc(2026, 1, 1),
    );
    expect(
      WorkoutAwardRule.weekStart(DateTime.utc(2026, 1, 1)),
      DateTime.utc(2025, 12, 29),
    );
    expect(
      WorkoutAwardRule.weekStart(DateTime.utc(2026, 1, 4)),
      DateTime.utc(2025, 12, 29),
    );
    expect(
      WorkoutAwardRule.weekStart(DateTime.utc(2026, 1, 5)),
      DateTime.utc(2026, 1, 5),
    );
  });

  test('two logs on the same day both earn a point', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-1',
        alreadyAwardedLogIds: {},
        awardedLogsInWorkoutWeek: 0,
        logDate: today,
        today: today,
      ),
      1,
    );
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-2',
        alreadyAwardedLogIds: {'log-1'},
        awardedLogsInWorkoutWeek: 1,
        logDate: today,
        today: today,
      ),
      1,
    );
  });

  test('the target log earns the frequency bonus once', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-3',
        alreadyAwardedLogIds: {'log-1', 'log-2'},
        awardedLogsInWorkoutWeek: 2,
        logDate: today,
        today: today,
      ),
      WorkoutAwardRule.pointsPerLog + WorkoutAwardRule.weeklyTargetBonus,
    );
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-4',
        alreadyAwardedLogIds: {'log-1', 'log-2', 'log-3'},
        awardedLogsInWorkoutWeek: 3,
        logDate: today,
        today: today,
      ),
      WorkoutAwardRule.pointsPerLog,
    );
  });

  test('a late log earns against the week it happened', () {
    final late = DateTime.utc(2026, 10, 11);
    expect(WorkoutAwardRule.calendarDaysBetween(late, today), 14);
    expect(WorkoutAwardRule.weekStart(late), DateTime.utc(2026, 10, 5));
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'late',
        alreadyAwardedLogIds: {},
        awardedLogsInWorkoutWeek: 2,
        logDate: late,
        today: today,
      ),
      2,
    );
  });

  test('the backfill window is inclusive at 14 days and saves older logs at 0',
      () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'edge',
        alreadyAwardedLogIds: {},
        awardedLogsInWorkoutWeek: 0,
        logDate: DateTime.utc(2026, 10, 11),
        today: today,
      ),
      1,
    );
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'too-old',
        alreadyAwardedLogIds: {},
        awardedLogsInWorkoutWeek: 0,
        logDate: DateTime.utc(2026, 10, 10),
        today: today,
      ),
      0,
    );
  });

  test('a future date is rejected', () {
    expect(
      () => WorkoutAwardRule.pointsForLog(
        logId: 'tomorrow',
        alreadyAwardedLogIds: {},
        awardedLogsInWorkoutWeek: 0,
        logDate: DateTime.utc(2026, 10, 26),
        today: today,
      ),
      throwsArgumentError,
    );
  });

  test('awarding the same log again adds nothing', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-3',
        alreadyAwardedLogIds: {'log-3'},
        awardedLogsInWorkoutWeek: 2,
        logDate: today,
        today: today,
      ),
      0,
    );
  });

  test('the cap stops later awards and never returns a negative amount', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-6',
        alreadyAwardedLogIds: {'log-1', 'log-2', 'log-3', 'log-4', 'log-5'},
        awardedLogsInWorkoutWeek: WorkoutAwardRule.weeklyCap,
        logDate: today,
        today: today,
      ),
      0,
    );
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'log-7',
        alreadyAwardedLogIds: {},
        awardedLogsInWorkoutWeek: WorkoutAwardRule.weeklyCap + 3,
        logDate: DateTime.utc(2026, 10, 20),
        today: today,
      ),
      0,
    );
  });

  test('a new week starts the count over', () {
    expect(
      WorkoutAwardRule.pointsForLog(
        logId: 'next-week',
        alreadyAwardedLogIds: {'log-1', 'log-2', 'log-3', 'log-4', 'log-5'},
        awardedLogsInWorkoutWeek: 0,
        logDate: DateTime.utc(2026, 10, 26),
        today: DateTime.utc(2026, 10, 26),
      ),
      WorkoutAwardRule.pointsPerLog,
    );
  });
}
