import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class JournalScreen extends StatelessWidget {
  const JournalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Quest Journal'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _LedgerEntry(
            date: 'Today',
            entry: 'Work recorded. Sand bag carries completed.',
          ),
          _LedgerEntry(
            date: 'Yesterday',
            entry: 'Wisdom goal reported. Journaling complete.',
          ),
          _LedgerEntry(
            date: '3 days ago',
            entry: 'Joined Bleakspire Barracks. Recruit oath signed.',
          ),
        ],
      ),
    );
  }
}

class _LedgerEntry extends StatelessWidget {
  final String date;
  final String entry;

  const _LedgerEntry({required this.date, required this.entry});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            date.toUpperCase(),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.weatheredBronze,
                ),
          ),
          const SizedBox(height: 4),
          Text(entry),
        ],
      ),
    );
  }
}
