import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'attribute_pools.dart';

/// One row of the staff session schedule. Dates are Denver calendar dates.
///
/// [start] and [end] are inclusive. A three-parter is one row with a longer
/// span than [ProgressionRules.sessionLengthDays]. An off-week is a date that
/// no row covers, so it is not represented by a row of its own.
class CohortSession {
  const CohortSession({
    required this.number,
    required this.start,
    required this.end,
  });

  /// Session number. The first session is 1.
  final int number;
  final DateTime start;
  final DateTime end;
}

/// First-adventure award config. The numbers are placeholders for John.
///
/// The same values are `progression_config()`, the seeded
/// `program_settings.cohort_start`, and `cohort_sessions` in
/// `supabase/migrations/20261025000000_attribute_pools.sql`. [timeZone] is an
/// IANA name. SQL applies it with `timezone(name, instant)`, which is
/// DST-aware. Dart uses the same name.
///
/// Automatic attribute points are earned only during the first adventure.
///
/// - The adventure is [firstAdventureSessions] sessions. At the usual pace
///   that is 16 weeks. The 27-point build is the binding cap: four sessions
///   at 6 points earn the 24 points still available, so a player who maxes
///   every session is done at session 4. Sessions 5 through 8 remain for a
///   player who earned fewer points earlier.
/// - When a schedule is passed, those rows are the only windows. A date in
///   no row is an off-week and earns nothing. A later row numbered within
///   the adventure still awards. When the schedule is empty, windows are
///   [sessionLengthDays] Denver dates from [cohortStart]. Session 1 starts
///   on that date. DST does not add or drop a calendar date.
/// - A workout log dated in one of those sessions is worth [pointsPerWorkout]
///   Physical point, up to [exercisePointsPerSession] per session.
/// - A completed goal is worth [pointsPerGoal]. Constitution goals pay the
///   Constitution pool. Intelligence, Wisdom, and Charisma goals pay Mental.
///   Goal points share a cap of [goalPointsPerSession] per session, separate
///   from the exercise cap.
/// - The build is the point-buy cost of the six scores plus unspent points in
///   every pool. The starting array already costs 3 of [pointBuyBudget].
///   Automatic awards stop when the build reaches [pointBuyBudget], or when
///   the workout date is outside a first-adventure session, whichever comes
///   first.
/// - A workout dated more than [backfillDays] before today is saved and earns
///   0. The award uses the session of the workout date. Future dates are
///   rejected. The same source id cannot be awarded twice.
/// - After the adventure, logs are still saved and earn 0. Nothing already
///   earned is removed.
class ProgressionRules {
  static const String timeZone = 'America/Denver';

  /// Placeholder. Inclusive days before today that can still earn points.
  static const int backfillDays = 14;

  /// Placeholder. Physical points for one awarded workout log.
  static const int pointsPerWorkout = 1;

  /// Placeholder. Points for one completed goal.
  static const int pointsPerGoal = 1;

  /// Placeholder. Exercise points one session can award.
  static const int exercisePointsPerSession = 3;

  /// Placeholder. Goal points one session can award.
  static const int goalPointsPerSession = 3;

  /// Placeholder. Denver calendar dates in one fallback session.
  ///
  /// Used only when no schedule rows are published. A published schedule
  /// replaces these windows, including a longer three-parter.
  static const int sessionLengthDays = 14;

  /// Placeholder. Sessions in the first adventure.
  ///
  /// Eight sessions is 16 weeks at the usual two-week pace. The point-buy
  /// budget stops a player who maxes every session at session 4.
  static const int firstAdventureSessions = 8;

  /// Placeholder. Full point-buy build, including the starting array's 3.
  static const int pointBuyBudget = 27;

  /// Placeholder cohort anchor. Session 1 starts on this Denver date when
  /// no schedule is published. John sets the live value in
  /// `program_settings.cohort_start`.
  static final DateTime cohortStart = DateTime.utc(2026, 10, 5);

  static const String exercisePool = AttributePools.physical;
  static const String workoutSource = 'workout';
  static const String goalSource = 'goal';

  static bool _zonesReady = false;

  static void ensureTimeZones() {
    if (_zonesReady) return;
    tzdata.initializeTimeZones();
    _zonesReady = true;
  }

  /// Calendar date of [instant] in [zone], or in [timeZone] when omitted.
  ///
  /// The returned value is a UTC [DateTime] at midnight whose year, month,
  /// and day are that zone's calendar date. It is a date, not an instant.
  static DateTime calendarDate(DateTime instant, {String? zone}) {
    ensureTimeZones();
    final location = tz.getLocation(zone ?? timeZone);
    final local = tz.TZDateTime.from(instant.toUtc(), location);
    return DateTime.utc(local.year, local.month, local.day);
  }

  /// Calendar days from [start] to [end]. Negative means [end] is earlier.
  static int calendarDaysBetween(DateTime start, DateTime end) {
    final first = _date(start);
    final last = _date(end);
    return last.difference(first).inDays;
  }

  static DateTime _date(DateTime value) {
    return DateTime.utc(value.year, value.month, value.day);
  }

  static String formatDate(DateTime companyCalendarDate) {
    final day = _date(companyCalendarDate);
    final month = day.month.toString().padLeft(2, '0');
    final date = day.day.toString().padLeft(2, '0');
    return '${day.year}-$month-$date';
  }

  static String poolForGoalCategory(String category) {
    switch (category.toLowerCase()) {
      case 'constitution':
      case 'con':
      case 'nutrition':
      case 'sleep':
        return AttributePools.constitution;
      case 'intelligence':
      case 'wisdom':
      case 'charisma':
      case 'int':
      case 'wis':
      case 'cha':
        return AttributePools.mental;
      default:
        throw ArgumentError('Unknown goal category: $category');
    }
  }

  /// Session that contains [companyDate], or null when the date is in no
  /// window.
  ///
  /// A non-empty [schedule] is the whole calendar. A date it does not cover
  /// is an off-week and returns null. An empty schedule uses the 14-day
  /// cadence from [anchor], or from [cohortStart] when [anchor] is omitted.
  /// The first session's number is 1. The cadence still returns later
  /// numbers; [inFirstAdventure] is what stops at [firstAdventureSessions].
  static CohortSession? sessionFor(
    DateTime companyDate, {
    DateTime? anchor,
    List<CohortSession> schedule = const [],
  }) {
    final day = _date(companyDate);
    if (schedule.isNotEmpty) {
      _checkSchedule(schedule);
      CohortSession? match;
      for (final row in schedule) {
        final start = _date(row.start);
        final end = _date(row.end);
        if (day.isBefore(start) || day.isAfter(end)) continue;
        if (match != null) {
          throw ArgumentError('Session windows overlap');
        }
        match = CohortSession(number: row.number, start: start, end: end);
      }
      return match;
    }

    final start = _date(anchor ?? cohortStart);
    final offset = calendarDaysBetween(start, day);
    if (offset < 0) return null;
    final index = offset ~/ sessionLengthDays;
    final windowStart = start.add(Duration(days: index * sessionLengthDays));
    return CohortSession(
      number: index + 1,
      start: windowStart,
      end: windowStart.add(Duration(days: sessionLengthDays - 1)),
    );
  }

  /// Session number for [companyDate], or null when it is in no window.
  /// The first session is 1.
  static int? sessionIndex(
    DateTime companyDate, {
    DateTime? anchor,
    List<CohortSession> schedule = const [],
  }) {
    return sessionFor(companyDate, anchor: anchor, schedule: schedule)?.number;
  }

  /// First day of the session that contains [companyDate], or null when the
  /// date is in no window.
  static DateTime? sessionStart(
    DateTime companyDate, {
    DateTime? anchor,
    List<CohortSession> schedule = const [],
  }) {
    return sessionFor(companyDate, anchor: anchor, schedule: schedule)?.start;
  }

  /// Last day of the session that contains [companyDate], or null when the
  /// date is in no window.
  static DateTime? sessionEnd(
    DateTime companyDate, {
    DateTime? anchor,
    List<CohortSession> schedule = const [],
  }) {
    return sessionFor(companyDate, anchor: anchor, schedule: schedule)?.end;
  }

  static bool inFirstAdventure(
    DateTime companyDate, {
    DateTime? anchor,
    List<CohortSession> schedule = const [],
  }) {
    final number = sessionIndex(
      companyDate,
      anchor: anchor,
      schedule: schedule,
    );
    if (number == null) return false;
    return number <= firstAdventureSessions;
  }

  static void _checkSchedule(List<CohortSession> schedule) {
    final seen = <int>{};
    for (final row in schedule) {
      if (row.number < 1) {
        throw ArgumentError('Session numbers start at 1');
      }
      if (!seen.add(row.number)) {
        throw ArgumentError('Session numbers must be unique');
      }
      if (_date(row.end).isBefore(_date(row.start))) {
        throw ArgumentError('Session end is before its start');
      }
    }
    for (var i = 0; i < schedule.length; i++) {
      for (var j = i + 1; j < schedule.length; j++) {
        final aStart = _date(schedule[i].start);
        final aEnd = _date(schedule[i].end);
        final bStart = _date(schedule[j].start);
        final bEnd = _date(schedule[j].end);
        final overlaps = !aEnd.isBefore(bStart) && !bEnd.isBefore(aStart);
        if (overlaps) {
          throw ArgumentError('Session windows overlap');
        }
      }
    }
  }

  static void _checkConfig() {
    if (pointsPerWorkout < 1 ||
        pointsPerGoal < 1 ||
        exercisePointsPerSession < 1 ||
        goalPointsPerSession < 1 ||
        sessionLengthDays < 1 ||
        firstAdventureSessions < 1 ||
        pointBuyBudget < 1 ||
        backfillDays < 0 ||
        timeZone.isEmpty) {
      throw StateError('Progression config is invalid');
    }
  }

  /// Points this workout log should add.
  ///
  /// [logDate] and [today] are company-zone calendar dates.
  /// [exercisePointsAlreadyInSession] is the exercise points already awarded
  /// for the session of [logDate], not including [logId].
  /// [buildTotal] is the point-buy cost of the scores plus every unspent pool.
  ///
  /// A future [logDate] throws. The log is not saved.
  /// Any other ineligible log returns 0 and is still saved.
  static int pointsForWorkout({
    required String logId,
    required Set<String> alreadyAwardedLogIds,
    required int exercisePointsAlreadyInSession,
    required int buildTotal,
    required DateTime logDate,
    required DateTime today,
    DateTime? anchor,
    List<CohortSession> schedule = const [],
  }) {
    _checkConfig();
    if (exercisePointsAlreadyInSession < 0) {
      throw ArgumentError('exercisePointsAlreadyInSession cannot be negative');
    }
    if (buildTotal < 0) {
      throw ArgumentError('buildTotal cannot be negative');
    }
    final age = calendarDaysBetween(logDate, today);
    if (age < 0) {
      throw ArgumentError('Future workout dates are rejected');
    }
    if (alreadyAwardedLogIds.contains(logId)) return 0;
    if (age > backfillDays) return 0;
    if (!inFirstAdventure(logDate, anchor: anchor, schedule: schedule)) {
      return 0;
    }
    return _allotment(
      unit: pointsPerWorkout,
      already: exercisePointsAlreadyInSession,
      cap: exercisePointsPerSession,
      buildTotal: buildTotal,
    );
  }

  /// Points this goal completion should add. The caller picks the pool with
  /// [poolForGoalCategory]. [completedOn] is the company-zone date of the
  /// completion and chooses the session.
  static int pointsForGoal({
    required String goalId,
    required Set<String> alreadyAwardedGoalIds,
    required int goalPointsAlreadyInSession,
    required int buildTotal,
    required DateTime completedOn,
    required DateTime today,
    DateTime? anchor,
    List<CohortSession> schedule = const [],
  }) {
    _checkConfig();
    if (goalPointsAlreadyInSession < 0) {
      throw ArgumentError('goalPointsAlreadyInSession cannot be negative');
    }
    if (buildTotal < 0) {
      throw ArgumentError('buildTotal cannot be negative');
    }
    if (calendarDaysBetween(completedOn, today) < 0) {
      throw ArgumentError('Future workout dates are rejected');
    }
    if (alreadyAwardedGoalIds.contains(goalId)) return 0;
    if (!inFirstAdventure(completedOn, anchor: anchor, schedule: schedule)) {
      return 0;
    }
    return _allotment(
      unit: pointsPerGoal,
      already: goalPointsAlreadyInSession,
      cap: goalPointsPerSession,
      buildTotal: buildTotal,
    );
  }

  static int _allotment({
    required int unit,
    required int already,
    required int cap,
    required int buildTotal,
  }) {
    final sessionRoom = cap - already;
    final budgetRoom = pointBuyBudget - buildTotal;
    if (sessionRoom <= 0 || budgetRoom <= 0) return 0;
    final award = unit < sessionRoom ? unit : sessionRoom;
    return award < budgetRoom ? award : budgetRoom;
  }
}
