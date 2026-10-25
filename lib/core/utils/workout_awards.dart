import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'attribute_pools.dart';

/// Workout award config. Every value below is a placeholder for John to set,
/// except the decision that this gym's clock is America/Denver.
///
/// The same values are the body of `workout_award_config()` in
/// `supabase/migrations/20261025000000_attribute_pools.sql`. Change them
/// together. [timeZone] is an IANA name so another gym can switch zones
/// without a new rule. SQL applies that name with `timezone(name, instant)`,
/// which is DST-aware. Dart uses the same name through the timezone database.
///
/// Rule:
/// - Each new workout log is worth [pointsPerLog] Physical points.
/// - "Today" and the workout date are calendar dates in [timeZone].
/// - The week is Monday through Sunday of those calendar dates. The week id
///   is that Monday. A week is seven dates, so the DST shift does not add or
///   drop a day.
/// - The award counts against the week the workout happened, including a log
///   entered late.
/// - A date from today back through [backfillDays] calendar days can earn
///   points. Older logs are saved and earn 0. Future dates are rejected.
/// - Awarded logs count toward [weeklyCap]. The cap counts logs that earned
///   points, so the frequency bonus does not use an extra slot.
/// - The log whose place in that week equals [weeklyTarget] also earns
///   [weeklyTargetBonus], once. Place is the order the awards were recorded.
/// - A later log in a full week is saved and awards 0. Nothing already
///   awarded is removed.
/// - Awarding the same log id again adds nothing.
/// - Two logs on the same date both count until the weekly cap.
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

  /// IANA zone for "today" and for the calendar date of a workout.
  /// Placeholder for this gym: Mountain time, DST-aware.
  static const String timeZone = 'America/Denver';

  /// Placeholder. Inclusive count of calendar days before today that still
  /// earn points. A workout on today - [backfillDays] earns points. The day
  /// before that is saved and earns 0.
  static const int backfillDays = 14;

  static const String pool = AttributePools.physical;
  static const String source = 'workout';

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

  /// Monday of the civil week that contains [companyCalendarDate].
  ///
  /// [companyCalendarDate] uses its year, month, and day only. Those fields
  /// are a date in the company zone.
  static DateTime weekStart(DateTime companyCalendarDate) {
    final day = DateTime.utc(
      companyCalendarDate.year,
      companyCalendarDate.month,
      companyCalendarDate.day,
    );
    return day.subtract(Duration(days: day.weekday - DateTime.monday));
  }

  /// Monday of the company-zone week that contains [instant].
  static DateTime weekStartOf(DateTime instant, {String? zone}) {
    return weekStart(calendarDate(instant, zone: zone));
  }

  /// Company-zone calendar days from [logDate] to [today].
  ///
  /// Negative means [logDate] is in the future.
  static int calendarDaysBetween(DateTime logDate, DateTime today) {
    final start = DateTime.utc(logDate.year, logDate.month, logDate.day);
    final end = DateTime.utc(today.year, today.month, today.day);
    return end.difference(start).inDays;
  }

  static String formatDate(DateTime companyCalendarDate) {
    final day = DateTime.utc(
      companyCalendarDate.year,
      companyCalendarDate.month,
      companyCalendarDate.day,
    );
    final month = day.month.toString().padLeft(2, '0');
    final date = day.day.toString().padLeft(2, '0');
    return '${day.year}-$month-$date';
  }

  /// Points this log should add.
  ///
  /// [logDate] and [today] are company-zone calendar dates.
  /// [awardedLogsInWorkoutWeek] counts awarded logs in the week of [logDate],
  /// not including [logId].
  ///
  /// A future [logDate] throws. The log is not saved.
  /// A log older than [backfillDays] returns 0. The log is still saved.
  static int pointsForLog({
    required String logId,
    required Set<String> alreadyAwardedLogIds,
    required int awardedLogsInWorkoutWeek,
    required DateTime logDate,
    required DateTime today,
  }) {
    if (pointsPerLog < 1 ||
        weeklyCap < 1 ||
        weeklyTarget < 1 ||
        weeklyTarget > weeklyCap ||
        weeklyTargetBonus < 0 ||
        backfillDays < 0 ||
        timeZone.isEmpty) {
      throw StateError('Workout award config is invalid');
    }
    if (awardedLogsInWorkoutWeek < 0) {
      throw ArgumentError('awardedLogsInWorkoutWeek cannot be negative');
    }
    final age = calendarDaysBetween(logDate, today);
    if (age < 0) {
      throw ArgumentError('Future workout dates are rejected');
    }
    if (alreadyAwardedLogIds.contains(logId)) return 0;
    if (age > backfillDays) return 0;
    if (awardedLogsInWorkoutWeek >= weeklyCap) return 0;

    final ordinal = awardedLogsInWorkoutWeek + 1;
    final bonus = ordinal == weeklyTarget ? weeklyTargetBonus : 0;
    return pointsPerLog + bonus;
  }
}
