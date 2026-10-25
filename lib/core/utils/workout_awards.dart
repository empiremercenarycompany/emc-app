import 'attribute_pools.dart';

/// Workout award config. Every number below is a placeholder for John to set.
///
/// The same four numbers are the body of `workout_award_config()` in
/// `supabase/migrations/20261025000000_attribute_pools.sql`. Change them
/// together.
///
/// Rule:
/// - Each new workout log is worth [pointsPerLog] Physical points.
/// - Awarded logs count toward [weeklyCap]. The cap is a count of logs that
///   earned points, not a count of points, so the frequency bonus does not
///   use up an extra slot.
/// - The log whose place in the week equals [weeklyTarget] also earns
///   [weeklyTargetBonus]. That bonus is paid once, on that log.
/// - A later log in the same week is saved and awards 0 once the cap is full.
///   Nothing already awarded is removed.
/// - Awarding the same log id again adds nothing.
/// - Two logs on the same date both count until the weekly cap.
///
/// Week boundary, identical to `workout_week_start(date)` in SQL:
/// the ISO week, Monday through Sunday, on the UTC calendar. The week id is
/// that Monday's date. Supabase `current_date` is that UTC calendar date.
/// PostgreSQL `date_trunc('week', day::timestamp)::date` is the same Monday
/// because `timestamp` without time zone is not shifted by the session zone.
///
/// Only a log whose `date` is the database `current_date` can earn points.
/// `record_workout` always stores that date, so a normal log is eligible.
/// A backdated row cannot be used to fill another week.
class WorkoutAwardRule {
  /// Placeholder. Physical points for one awarded log, before the bonus.
  static const int pointsPerLog = 1;

  /// Placeholder. Awarded logs that still earn points in one week.
  static const int weeklyCap = 5;

  /// Placeholder. The awarded log that earns [weeklyTargetBonus].
  /// Must be from 1 through [weeklyCap].
  static const int weeklyTarget = 3;

  /// Placeholder. Extra Physical points on the [weeklyTarget]th awarded log.
  static const int weeklyTargetBonus = 1;

  static const String pool = AttributePools.physical;
  static const String source = 'workout';

  /// Monday of the ISO week that contains [utcCalendarDay], as a UTC date.
  ///
  /// [utcCalendarDay] must already be UTC. Its year, month, and day are the
  /// calendar date. The time of day is ignored.
  static DateTime weekStartUtc(DateTime utcCalendarDay) {
    if (!utcCalendarDay.isUtc) {
      throw ArgumentError(
        'Week boundaries use the UTC calendar date. Pass a UTC DateTime.',
      );
    }
    final day = DateTime.utc(
      utcCalendarDay.year,
      utcCalendarDay.month,
      utcCalendarDay.day,
    );
    return day.subtract(Duration(days: day.weekday - DateTime.monday));
  }

  /// Points this log should add.
  ///
  /// [alreadyAwardedLogIds] are logs that already have an award.
  /// [awardedLogsThisWeek] counts awarded logs in the same week, not
  /// including [logId].
  static int pointsForLog({
    required String logId,
    required Set<String> alreadyAwardedLogIds,
    required int awardedLogsThisWeek,
  }) {
    if (pointsPerLog < 1 ||
        weeklyCap < 1 ||
        weeklyTarget < 1 ||
        weeklyTarget > weeklyCap ||
        weeklyTargetBonus < 0) {
      throw StateError('Workout award config is invalid');
    }
    if (awardedLogsThisWeek < 0) {
      throw ArgumentError('awardedLogsThisWeek cannot be negative');
    }
    if (alreadyAwardedLogIds.contains(logId)) return 0;
    if (awardedLogsThisWeek >= weeklyCap) return 0;

    final ordinal = awardedLogsThisWeek + 1;
    final bonus = ordinal == weeklyTarget ? weeklyTargetBonus : 0;
    return pointsPerLog + bonus;
  }
}
