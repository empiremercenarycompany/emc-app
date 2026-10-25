import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/missions_provider.dart';
import '../../../core/theme/app_theme.dart';

class MissionsScreen extends ConsumerWidget {
  const MissionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final missionsAsync = ref.watch(missionsProvider);

    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Missions'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: missionsAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.mercenaryRed)),
        error: (err, stack) =>
            Center(child: Text('Failed to load missions.\n$err')),
        data: (missions) {
          if (missions.isEmpty) {
            return const Center(child: Text('No contracts posted.'));
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: missions.length,
            itemBuilder: (context, index) {
              final mission = missions[index];
              return Card(
                color: const Color(0xFF1A1A1A),
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(mission.title),
                  subtitle: Text(mission.focus ?? 'General'),
                  trailing: Text(
                    mission.status,
                    style: TextStyle(
                      color: mission.status == 'active'
                          ? AppColors.mercenaryRed
                          : AppColors.steelGray,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
