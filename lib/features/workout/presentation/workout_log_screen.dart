import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/workout_awards.dart';
import '../../../services/supabase_service.dart';
import '../../character/providers/character_provider.dart';

class WorkoutLogScreen extends ConsumerStatefulWidget {
  const WorkoutLogScreen({super.key});

  @override
  ConsumerState<WorkoutLogScreen> createState() => _WorkoutLogScreenState();
}

class _WorkoutLogScreenState extends ConsumerState<WorkoutLogScreen> {
  final _exerciseController = TextEditingController();
  final _setsController = TextEditingController();
  final _repsController = TextEditingController();
  String _type = 'strength';
  bool _saving = false;

  static const _types = ['strength', 'dexterity', 'functional'];

  @override
  void dispose() {
    _exerciseController.dispose();
    _setsController.dispose();
    _repsController.dispose();
    super.dispose();
  }

  int? _optionalInt(TextEditingController controller, String label) {
    final text = controller.text.trim();
    if (text.isEmpty) return null;
    final value = int.tryParse(text);
    if (value == null || value < 0) {
      throw FormatException('$label must be a whole number.');
    }
    return value;
  }

  Future<void> _record() async {
    final character = ref.read(characterProvider).value;
    if (character == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Create a character before logging work.')),
      );
      return;
    }

    final exercise = _exerciseController.text.trim();
    if (exercise.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Name the exercise.')),
      );
      return;
    }

    late final int? sets;
    late final int? reps;
    try {
      sets = _optionalInt(_setsController, 'Sets');
      reps = _optionalInt(_repsController, 'Reps');
    } on FormatException catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final result = await SupabaseService.recordWorkout(
        characterId: character.id,
        type: _type,
        exercise: exercise,
        sets: sets,
        reps: reps,
      );
      ref.invalidate(characterProvider);
      if (!mounted) return;
      final String message;
      if (result.pointsAwarded <= 0) {
        message =
            "Work recorded. This week's Physical awards are already at the cap.";
      } else if (result.pointsAwarded > WorkoutAwardRule.pointsPerLog) {
        message =
            'Work recorded. +${result.pointsAwarded} Physical, including the weekly target bonus.';
      } else {
        message = 'Work recorded. +${result.pointsAwarded} Physical.';
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      _exerciseController.clear();
      _setsController.clear();
      _repsController.clear();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to record work: $error')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Log Work'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Each workout can earn Physical points until the weekly cap. '
              'Two in one day both count. Past the cap, the log is kept and awards nothing.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.steelGray,
                  ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(
                labelText: 'Focus',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final type in _types)
                  DropdownMenuItem(value: type, child: Text(type)),
              ],
              onChanged: _saving
                  ? null
                  : (value) {
                      if (value != null) setState(() => _type = value);
                    },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _exerciseController,
              decoration: const InputDecoration(
                labelText: 'Exercise',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _setsController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Sets',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _repsController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Reps',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const Spacer(),
            Text(
              'Placeholders for John: ${WorkoutAwardRule.pointsPerLog} per workout, '
              'cap ${WorkoutAwardRule.weeklyCap} awarded logs per week '
              '(Monday–Sunday UTC). The ${WorkoutAwardRule.weeklyTarget}th '
              'awarded log adds +${WorkoutAwardRule.weeklyTargetBonus}.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.weatheredBronze,
                  ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _saving ? null : _record,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.mercenaryRed,
                foregroundColor: AppColors.parchmentWhite,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Record Work'),
            ),
          ],
        ),
      ),
    );
  }
}
