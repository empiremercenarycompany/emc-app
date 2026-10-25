import 'package:emc_app/core/utils/attribute_pools.dart';
import 'package:emc_app/core/utils/progression.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final anchor = DateTime.utc(2026, 10, 5);
  final today = DateTime.utc(2026, 10, 25);
  const build = 3;

  setUpAll(ProgressionRules.ensureTimeZones);

  int workout({
    String logId = 'log',
    Set<String> awarded = const {},
    int already = 0,
    int total = build,
    required DateTime logDate,
    DateTime? on,
    DateTime? cohort,
    List<CohortSession> schedule = const [],
  }) {
    return ProgressionRules.pointsForWorkout(
      logId: logId,
      alreadyAwardedLogIds: awarded,
      exercisePointsAlreadyInSession: already,
      buildTotal: total,
      logDate: logDate,
      today: on ?? today,
      anchor: cohort ?? anchor,
      schedule: schedule,
    );
  }

  test('placeholder config is the first adventure', () {
    expect(ProgressionRules.timeZone, 'America/Denver');
    expect(ProgressionRules.backfillDays, 14);
    expect(ProgressionRules.pointsPerWorkout, 1);
    expect(ProgressionRules.pointsPerGoal, 1);
    expect(ProgressionRules.exercisePointsPerSession, 3);
    expect(ProgressionRules.goalPointsPerSession, 3);
    expect(ProgressionRules.sessionLengthDays, 14);
    expect(ProgressionRules.firstAdventureSessions, 8);
    expect(ProgressionRules.pointBuyBudget, 27);
    expect(ProgressionRules.cohortStart, DateTime.utc(2026, 10, 5));
    expect(
      ProgressionRules.exercisePointsPerSession +
          ProgressionRules.goalPointsPerSession,
      6,
    );
    // Eight sessions can offer 48 points. The 27-point build is the cap
    // that binds first: four maxed sessions earn the 24 points still open.
    expect(4 * 6, ProgressionRules.pointBuyBudget - build);
    expect(
      ProgressionRules.firstAdventureSessions * 6,
      greaterThan(ProgressionRules.pointBuyBudget - build),
    );
  });

  test('goal categories pay Constitution or Mental', () {
    expect(
      ProgressionRules.poolForGoalCategory('constitution'),
      AttributePools.constitution,
    );
    expect(
      ProgressionRules.poolForGoalCategory('nutrition'),
      AttributePools.constitution,
    );
    expect(
      ProgressionRules.poolForGoalCategory('sleep'),
      AttributePools.constitution,
    );
    expect(
      ProgressionRules.poolForGoalCategory('intelligence'),
      AttributePools.mental,
    );
    expect(
        ProgressionRules.poolForGoalCategory('wisdom'), AttributePools.mental);
    expect(ProgressionRules.poolForGoalCategory('charisma'),
        AttributePools.mental);
  });

  test('a fallback session is 14 Denver dates and the adventure is eight', () {
    final session8Start = anchor.add(const Duration(days: 7 * 14));
    final session8End = session8Start.add(const Duration(days: 13));
    final after = session8End.add(const Duration(days: 1));

    expect(
        ProgressionRules.sessionIndex(DateTime.utc(2026, 10, 4),
            anchor: anchor),
        isNull);
    expect(ProgressionRules.sessionIndex(anchor, anchor: anchor), 1);
    expect(
        ProgressionRules.sessionIndex(DateTime.utc(2026, 10, 18),
            anchor: anchor),
        1);
    expect(
        ProgressionRules.sessionEnd(DateTime.utc(2026, 10, 18), anchor: anchor),
        DateTime.utc(2026, 10, 18));
    expect(
        ProgressionRules.sessionStart(DateTime.utc(2026, 10, 18),
            anchor: anchor),
        anchor);
    expect(
        ProgressionRules.sessionIndex(DateTime.utc(2026, 10, 19),
            anchor: anchor),
        2);
    expect(
      ProgressionRules.sessionStart(DateTime.utc(2026, 10, 19), anchor: anchor),
      DateTime.utc(2026, 10, 19),
    );
    expect(
        ProgressionRules.inFirstAdventure(DateTime.utc(2026, 11, 29),
            anchor: anchor),
        isTrue);
    expect(
        ProgressionRules.sessionIndex(DateTime.utc(2026, 11, 29),
            anchor: anchor),
        4);
    expect(ProgressionRules.sessionIndex(session8End, anchor: anchor), 8);
    expect(
        ProgressionRules.inFirstAdventure(session8End, anchor: anchor), isTrue);
    expect(ProgressionRules.sessionIndex(after, anchor: anchor), 9);
    expect(ProgressionRules.inFirstAdventure(after, anchor: anchor), isFalse);
  });

  test('Denver midnight, not UTC, chooses the calendar date', () {
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 10, 26, 5, 30)),
      DateTime.utc(2026, 10, 25),
    );
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 10, 26, 6)),
      DateTime.utc(2026, 10, 26),
    );
    expect(
      ProgressionRules.calendarDate(
        DateTime.utc(2026, 10, 26, 5, 30),
        zone: 'America/New_York',
      ),
      DateTime.utc(2026, 10, 26),
    );
  });

  test('spring forward does not skip a session date', () {
    final march = DateTime.utc(2026, 3, 1);
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 3, 8, 8, 30)),
      DateTime.utc(2026, 3, 8),
    );
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 3, 8, 9, 30)),
      DateTime.utc(2026, 3, 8),
    );
    expect(
        ProgressionRules.sessionIndex(DateTime.utc(2026, 3, 8), anchor: march),
        1);
    expect(
        ProgressionRules.sessionIndex(DateTime.utc(2026, 3, 15), anchor: march),
        2);
  });

  test('fall back repeats an hour on the same session date', () {
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 11, 1, 7, 30)),
      DateTime.utc(2026, 11, 1),
    );
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 11, 1, 8, 30)),
      DateTime.utc(2026, 11, 1),
    );
    expect(
        ProgressionRules.sessionIndex(DateTime.utc(2026, 11, 1),
            anchor: anchor),
        2);
  });

  test('the new year stays on the Denver calendar', () {
    final december = DateTime.utc(2025, 12, 29);
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 1, 1, 6, 30)),
      DateTime.utc(2025, 12, 31),
    );
    expect(
      ProgressionRules.sessionIndex(DateTime.utc(2025, 12, 31),
          anchor: december),
      1,
    );
    expect(
      ProgressionRules.calendarDate(DateTime.utc(2026, 1, 1, 7)),
      DateTime.utc(2026, 1, 1),
    );
    expect(
      ProgressionRules.sessionIndex(DateTime.utc(2026, 1, 12),
          anchor: december),
      2,
    );
  });

  test('two workouts on one day both earn a point until the session cap', () {
    expect(workout(logId: 'a', logDate: today), 1);
    expect(workout(logId: 'b', awarded: {'a'}, already: 1, logDate: today), 1);
    expect(workout(logId: 'c', already: 2, logDate: today), 1);
    expect(workout(logId: 'd', already: 3, logDate: today), 0);
  });

  test('a late log earns against the session it happened in', () {
    final late = DateTime.utc(2026, 10, 11);
    expect(ProgressionRules.calendarDaysBetween(late, today), 14);
    expect(ProgressionRules.sessionIndex(late, anchor: anchor), 1);
    expect(ProgressionRules.sessionIndex(today, anchor: anchor), 2);
    expect(workout(logId: 'late', already: 2, logDate: late), 1);
  });

  test('the backfill window is inclusive at 14 days', () {
    expect(workout(logDate: DateTime.utc(2026, 10, 11)), 1);
    expect(workout(logDate: DateTime.utc(2026, 10, 10)), 0);
  });

  test('dates outside the adventure and a full build earn nothing', () {
    final after = anchor.add(const Duration(days: 8 * 14));
    expect(
        workout(
            logDate: DateTime.utc(2026, 10, 4), on: DateTime.utc(2026, 10, 5)),
        0);
    expect(workout(logDate: after, on: after), 0);
    expect(ProgressionRules.inFirstAdventure(after, anchor: anchor), isFalse);
    expect(workout(logDate: today, total: 27), 0);
    expect(workout(logDate: today, total: 30), 0);
    expect(workout(logDate: today, total: 26), 1);
  });

  test('a future date is rejected and a replay adds nothing', () {
    expect(
      () => workout(logDate: DateTime.utc(2026, 10, 26)),
      throwsArgumentError,
    );
    expect(workout(logId: 'a', awarded: {'a'}, logDate: today), 0);
  });

  test('goal points use their own cap and stop at the same build', () {
    expect(
      ProgressionRules.pointsForGoal(
        goalId: 'g1',
        alreadyAwardedGoalIds: {},
        goalPointsAlreadyInSession: 0,
        buildTotal: build,
        completedOn: today,
        today: today,
        anchor: anchor,
      ),
      1,
    );
    expect(
      ProgressionRules.pointsForGoal(
        goalId: 'g4',
        alreadyAwardedGoalIds: {},
        goalPointsAlreadyInSession: 3,
        buildTotal: build,
        completedOn: today,
        today: today,
        anchor: anchor,
      ),
      0,
    );
    expect(
      ProgressionRules.pointsForGoal(
        goalId: 'g1',
        alreadyAwardedGoalIds: {'g1'},
        goalPointsAlreadyInSession: 1,
        buildTotal: build,
        completedOn: today,
        today: today,
        anchor: anchor,
      ),
      0,
    );
  });

  test('a published schedule replaces the 14-day cadence', () {
    final threeParter = DateTime.utc(2026, 10, 25);
    final offWeek = DateTime.utc(2026, 10, 26);
    final next = DateTime.utc(2026, 11, 2);
    final schedule = [
      CohortSession(
        number: 1,
        start: anchor,
        end: threeParter,
      ),
      CohortSession(
        number: 2,
        start: next,
        end: DateTime.utc(2026, 11, 15),
      ),
    ];

    expect(ProgressionRules.sessionIndex(threeParter, schedule: schedule), 1);
    expect(
      ProgressionRules.sessionStart(threeParter, schedule: schedule),
      anchor,
    );
    expect(ProgressionRules.sessionIndex(offWeek, schedule: schedule), isNull);
    expect(ProgressionRules.inFirstAdventure(offWeek, schedule: schedule),
        isFalse);
    expect(ProgressionRules.sessionIndex(next, schedule: schedule), 2);
    expect(
      workout(logDate: threeParter, on: threeParter, schedule: schedule),
      1,
    );
    expect(workout(logDate: offWeek, on: next, schedule: schedule), 0);
    expect(workout(logDate: next, on: next, schedule: schedule), 1);
    expect(
      ProgressionRules.pointsForGoal(
        goalId: 'off-week',
        alreadyAwardedGoalIds: {},
        goalPointsAlreadyInSession: 0,
        buildTotal: build,
        completedOn: offWeek,
        today: next,
        schedule: schedule,
      ),
      0,
    );
    // The same date would be session 2 on the cadence. The schedule wins.
    expect(ProgressionRules.sessionIndex(threeParter, anchor: anchor), 2);
  });

  test('a session past the first adventure earns nothing', () {
    final later = [
      CohortSession(
        number: 9,
        start: anchor,
        end: DateTime.utc(2026, 10, 18),
      ),
    ];
    expect(ProgressionRules.inFirstAdventure(anchor, schedule: later), isFalse);
    expect(workout(logDate: anchor, on: anchor, schedule: later), 0);
  });

  test('a schedule with an overlap or a backwards window is rejected', () {
    expect(
      () => ProgressionRules.sessionFor(
        anchor,
        schedule: [
          CohortSession(
              number: 1, start: anchor, end: DateTime.utc(2026, 10, 20)),
          CohortSession(
            number: 2,
            start: DateTime.utc(2026, 10, 20),
            end: DateTime.utc(2026, 11, 2),
          ),
        ],
      ),
      throwsArgumentError,
    );
    expect(
      () => ProgressionRules.sessionFor(
        anchor,
        schedule: [
          CohortSession(
            number: 1,
            start: DateTime.utc(2026, 10, 20),
            end: anchor,
          ),
        ],
      ),
      throwsArgumentError,
    );
  });
}
