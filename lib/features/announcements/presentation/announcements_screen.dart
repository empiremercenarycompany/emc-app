import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Announcements'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _AnnouncementCard(
            title: 'Induction Approaches',
            body: 'Class selection opens at Week 6. Prepare your legend.',
            pinned: true,
          ),
          _AnnouncementCard(
            title: 'Barracks Construction',
            body: 'Phase 1 materials still required. Report completed carries.',
            pinned: false,
          ),
          _AnnouncementCard(
            title: 'Next Episode',
            body:
                'Adventure 1, Part 2. Saturday. Attendance grants loot share.',
            pinned: false,
          ),
        ],
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final String title;
  final String body;
  final bool pinned;

  const _AnnouncementCard({
    required this.title,
    required this.body,
    required this.pinned,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF1A1A1A),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (pinned)
                  const Icon(Icons.push_pin,
                      size: 16, color: AppColors.mercenaryRed),
                if (pinned) const SizedBox(width: 8),
                Expanded(
                  child: Text(title,
                      style: Theme.of(context).textTheme.titleMedium),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(body),
          ],
        ),
      ),
    );
  }
}
