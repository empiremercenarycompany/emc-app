import 'package:emc_app/core/utils/progression.dart';
import 'package:emc_app/features/workout/presentation/workout_log_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('log work shows the first adventure and the Denver clock',
      (tester) async {
    ProgressionRules.ensureTimeZones();
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: WorkoutLogScreen()),
      ),
    );

    expect(find.text('Date'), findsOneWidget);
    expect(find.textContaining('America/Denver'), findsWidgets);
    expect(find.textContaining('first adventure'), findsWidgets);
    expect(find.textContaining('14'), findsWidgets);
    expect(find.text('Record Work'), findsOneWidget);

    final today = ProgressionRules.calendarDate(DateTime.now());
    expect(find.textContaining(ProgressionRules.formatDate(today)),
        findsOneWidget);
  });
}
