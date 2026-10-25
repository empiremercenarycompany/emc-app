import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SessionCheckInScreen extends StatelessWidget {
  const SessionCheckInScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Session Check-In'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Adventure 1 — Part 2',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Saturday · 18:00',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.steelGray,
                  ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Check in to claim your share of loot for this session.',
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content:
                          Text('Attendance recorded. Loot share granted.')),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.mercenaryRed,
                foregroundColor: AppColors.parchmentWhite,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Check In'),
            ),
            const SizedBox(height: 32),
            Text(
              'Shared Notes',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Expanded(
              child: TextField(
                maxLines: null,
                expands: true,
                decoration: InputDecoration(
                  hintText: 'Record observations from the session...',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
