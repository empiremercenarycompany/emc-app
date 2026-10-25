import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/attribute_pools.dart';
import '../../../services/supabase_service.dart';

class GoalsScreen extends ConsumerStatefulWidget {
  const GoalsScreen({super.key});

  @override
  ConsumerState<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends ConsumerState<GoalsScreen> {
  List<Map<String, dynamic>> _goals = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final goals = await SupabaseService.fetchGoals();
      if (mounted) setState(() => _goals = goals);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _completeGoal(String goalId, String characterId) async {
    await SupabaseService.client.from('goal_logs').insert({
      'goal_id': goalId,
      'character_id': characterId,
      'points_awarded': 1,
    });
    // Existing complete button only. Goal creation is still not built.
    // The award is Mental, and repeating the same goal does not add points again.
    final awarded = await SupabaseService.awardAttributePoints(
      characterId: characterId,
      points: 1,
      source: 'goal',
      pool: AttributePools.mental,
      sourceId: goalId,
      reason: 'Goal completed',
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            awarded > 0
                ? 'Goal recorded. +$awarded Mental.'
                : 'That goal was already counted.',
          ),
        ),
      );
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Goals'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.mercenaryRed,
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.mercenaryRed))
            : _goals.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 120),
                      Center(
                          child: Text(
                              'No active goals.\nCreate one to begin earning points.')),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _goals.length,
                    itemBuilder: (context, index) {
                      final goal = _goals[index];
                      return Card(
                        color: const Color(0xFF1A1A1A),
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          title: Text(goal['title'] ?? ''),
                          subtitle: Text(goal['category'] ?? ''),
                          trailing: IconButton(
                            icon: const Icon(Icons.check_circle_outline,
                                color: AppColors.mercenaryRed),
                            onPressed: () =>
                                _completeGoal(goal['id'], goal['character_id']),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
