import 'package:emc_app/core/utils/workout_awards.dart';
import 'package:emc_app/features/workout/presentation/workout_log_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('log work shows the Denver week and the backfill window',
      (tester) async {
    WorkoutAwardRule.ensureTimeZones();
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: WorkoutLogScreen()),
      ),
    );

    expect(find.text('Date'), findsOneWidget);
    expect(find.textContaining('America/Denver'), findsWidgets);
    expect(find.textContaining('14'), findsWidgets);
    expect(find.text('Record Work'), findsOneWidget);

    final today = WorkoutAwardRule.calendarDate(DateTime.now());
    expect(find.textContaining(WorkoutAwardRule.formatDate(today)),
        findsOneWidget);
  });
}
