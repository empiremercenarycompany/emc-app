import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SquadScreen extends StatelessWidget {
  const SquadScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Squad'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Bleakspire Patrol',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          Text(
            '4 / 6 members',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.steelGray,
                ),
          ),
          const SizedBox(height: 16),
          const _MemberTile(name: 'Kael Ironhand', rank: 'Recruit', level: 1),
          const _MemberTile(name: 'Mira Stone', rank: 'Recruit', level: 1),
          const _MemberTile(name: 'Torin Vale', rank: 'Sergeant', level: 1),
          const _MemberTile(name: 'Lena Cross', rank: 'Recruit', level: 1),
        ],
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  final String name;
  final String rank;
  final int level;

  const _MemberTile({
    required this.name,
    required this.rank,
    required this.level,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF1A1A1A),
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: AppColors.steelGray,
          child: Icon(Icons.person, color: AppColors.parchmentWhite),
        ),
        title: Text(name),
        subtitle: Text('$rank · Level $level'),
      ),
    );
  }
}
