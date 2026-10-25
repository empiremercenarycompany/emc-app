import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../missions/providers/missions_provider.dart';
import '../../../core/theme/app_theme.dart';

class BarracksScreen extends ConsumerWidget {
  const BarracksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final missionsAsync = ref.watch(missionsProvider);

    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Barracks'),
        backgroundColor: AppColors.ironBlack,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.go('/announcements'),
          ),
          IconButton(
            icon: const Icon(Icons.calendar_today_outlined),
            onPressed: () => context.go('/calendar'),
          ),
        ],
      ),
      body: missionsAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.mercenaryRed)),
        error: (err, stack) =>
            Center(child: Text('Failed to load contracts.\n$err')),
        data: (missions) {
          final active = missions.where((m) => m.status == 'active').toList();
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _SectionHeader(title: 'Active Contracts'),
              if (active.isEmpty)
                const Text('No active contracts.')
              else
                ...active.map((mission) => _MissionCard(
                      title: mission.title,
                      subtitle: mission.focus ?? 'General',
                      progress: mission.progress,
                    )),
              const SizedBox(height: 16),
              _SectionHeader(title: 'Next Session'),
              _InfoCard(
                title: 'Adventure 1 — Part 2',
                subtitle: 'Saturday · 18:00',
                trailing: 'Check In',
                onTap: () => context.go('/session'),
              ),
              const SizedBox(height: 16),
              _SectionHeader(title: 'Company Notices'),
              _InfoCard(
                title: 'Induction approaches',
                subtitle: 'Class selection opens at Week 6',
                onTap: () => context.go('/announcements'),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _ActionButton(
                      label: 'Log Work',
                      onPressed: () => context.go('/workout'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _ActionButton(
                      label: 'Goals',
                      onPressed: () => context.go('/goals'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _ActionButton(
                label: 'Squad Roster',
                onPressed: () => context.go('/squad'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.weatheredBronze,
              letterSpacing: 1.2,
            ),
      ),
    );
  }
}

class _MissionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final double progress;

  const _MissionCard({
    required this.title,
    required this.subtitle,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF1A1A1A),
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: progress,
              backgroundColor: AppColors.steelGray,
              color: AppColors.mercenaryRed,
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? trailing;
  final VoidCallback? onTap;

  const _InfoCard({
    required this.title,
    required this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF1A1A1A),
      child: ListTile(
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: trailing != null
            ? Text(trailing!,
                style: const TextStyle(color: AppColors.mercenaryRed))
            : null,
        onTap: onTap,
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const _ActionButton({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.mercenaryRed,
        foregroundColor: AppColors.parchmentWhite,
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
      child: Text(label),
    );
  }
}
