import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Calendar'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _EventTile(
            title: 'Adventure 1 — Part 2',
            date: 'Saturday · 18:00',
            type: 'Session',
          ),
          _EventTile(
            title: 'Strength Block',
            date: 'Monday – Thursday',
            type: 'Training',
          ),
          _EventTile(
            title: 'Week 6 Induction',
            date: 'Upcoming',
            type: 'Milestone',
          ),
        ],
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  final String title;
  final String date;
  final String type;

  const _EventTile({
    required this.title,
    required this.date,
    required this.type,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF1A1A1A),
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text(title),
        subtitle: Text(date),
        trailing: Text(
          type,
          style: const TextStyle(color: AppColors.weatheredBronze),
        ),
      ),
    );
  }
}
