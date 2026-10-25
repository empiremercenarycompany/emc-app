import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../services/supabase_service.dart';

class Mission {
  final String id;
  final String title;
  final String? focus;
  final String status;
  final double progress;

  const Mission({
    required this.id,
    required this.title,
    this.focus,
    required this.status,
    this.progress = 0.0,
  });

  factory Mission.fromMap(Map<String, dynamic> map) {
    return Mission(
      id: map['id'] as String,
      title: map['title'] as String? ?? 'Contract',
      focus: map['attribute_focus'] as String?,
      status: map['status'] as String? ?? 'active',
      progress: 0.0, // calculated from objectives in a fuller implementation
    );
  }
}

final missionsProvider = FutureProvider<List<Mission>>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (auth.isLoading || auth.asData?.value.session == null) return [];

  final data = await SupabaseService.fetchMissions();
  return data.map(Mission.fromMap).toList();
});
