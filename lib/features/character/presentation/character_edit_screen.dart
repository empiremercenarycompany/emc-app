import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/character_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/attribute_pools.dart';
import '../../../core/utils/point_buy.dart';
import '../../../services/supabase_service.dart';

class CharacterEditScreen extends ConsumerStatefulWidget {
  const CharacterEditScreen({super.key});

  @override
  ConsumerState<CharacterEditScreen> createState() =>
      _CharacterEditScreenState();
}

class _CharacterEditScreenState extends ConsumerState<CharacterEditScreen> {
  final _nameController = TextEditingController();
  final _originController = TextEditingController();
  final _professionController = TextEditingController();
  final _raceController = TextEditingController();

  AbilityScores _scores = const AbilityScores(
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
  );
  PoolBalances _pools = const PoolBalances(
    physical: 0,
    constitution: 0,
    mental: 0,
  );
  String? _characterId;
  bool _loading = false;

  static const _sections = [
    (AttributePools.physical, 'Physical', 'Strength and Dexterity'),
    (AttributePools.constitution, 'Constitution', 'Nutrition and sleep'),
    (AttributePools.mental, 'Mental', 'SMART goals'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _originController.dispose();
    _professionController.dispose();
    _raceController.dispose();
    super.dispose();
  }

  void _load() {
    final character = ref.read(characterProvider).value;
    if (character == null) return;

    setState(() {
      _characterId = character.id;
      _nameController.text = character.name;
      _originController.text = character.originWord ?? '';
      _professionController.text = character.profession ?? '';
      _raceController.text = character.race ?? '';
      _scores = character.scores;
      _pools = character.pools;
    });
  }

  Future<void> _save() async {
    if (_characterId == null) return;

    final character = ref.read(characterProvider).value;
    if (character == null) return;
    final check = AttributeSpend.check(
      from: character.scores,
      to: _scores,
      pools: character.pools,
    );
    if (!check.isValid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That spend is not legal.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await SupabaseService.updateCharacter(
        characterId: _characterId!,
        name: _nameController.text.trim(),
        originWord: _originController.text.trim(),
        profession: _professionController.text.trim(),
        race: _raceController.text.trim(),
      );
      await SupabaseService.spendAttributePoints(
        characterId: _characterId!,
        strength: _scores.strength,
        dexterity: _scores.dexterity,
        constitution: _scores.constitution,
        intelligence: _scores.intelligence,
        wisdom: _scores.wisdom,
        charisma: _scores.charisma,
      );
      ref.invalidate(characterProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Character updated.')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _adjust(String ability, int delta) {
    final step = AttributeSpend.step(
      scores: _scores,
      pools: _pools,
      ability: ability,
      delta: delta,
    );
    if (step == null) return;
    setState(() {
      _scores = step.scores;
      _pools = step.pools;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Edit Character'),
        backgroundColor: AppColors.ironBlack,
        actions: [
          TextButton(
            onPressed: _loading ? null : _save,
            child: _loading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _originController,
            decoration: const InputDecoration(labelText: 'Origin Word'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _professionController,
            decoration: const InputDecoration(labelText: 'Profession'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _raceController,
            decoration: const InputDecoration(labelText: 'Race'),
          ),
          const SizedBox(height: 24),
          for (final section in _sections) ...[
            _PoolHeader(
              title: section.$2,
              subtitle: section.$3,
              points: _pools.valueOf(section.$1),
            ),
            for (final ability in AttributePools.abilities[section.$1]!)
              _AttributeEditor(
                label: _label(ability),
                value: _scores.valueOf(ability),
                cost: PointBuy.costFor(_scores.valueOf(ability)),
                onIncrease: AttributeSpend.step(
                          scores: _scores,
                          pools: _pools,
                          ability: ability,
                          delta: 1,
                        ) ==
                        null
                    ? null
                    : () => _adjust(ability, 1),
                onDecrease: AttributeSpend.step(
                          scores: _scores,
                          pools: _pools,
                          ability: ability,
                          delta: -1,
                        ) ==
                        null
                    ? null
                    : () => _adjust(ability, -1),
              ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }

  static String _label(String ability) {
    switch (ability) {
      case 'strength':
        return 'Strength';
      case 'dexterity':
        return 'Dexterity';
      case 'constitution':
        return 'Constitution';
      case 'intelligence':
        return 'Intelligence';
      case 'wisdom':
        return 'Wisdom';
      case 'charisma':
        return 'Charisma';
      default:
        return ability;
    }
  }
}

class _PoolHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final int points;

  const _PoolHeader({
    required this.title,
    required this.subtitle,
    required this.points,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.toUpperCase(),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.weatheredBronze,
                        letterSpacing: 1.2,
                      ),
                ),
                Text(
                  subtitle,
                  style:
                      const TextStyle(color: AppColors.steelGray, fontSize: 12),
                ),
              ],
            ),
          ),
          Text(
            '$points',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppColors.weatheredBronze,
                ),
          ),
        ],
      ),
    );
  }
}

class _AttributeEditor extends StatelessWidget {
  final String label;
  final int value;
  final int cost;
  final VoidCallback? onIncrease;
  final VoidCallback? onDecrease;

  const _AttributeEditor({
    required this.label,
    required this.value,
    required this.cost,
    required this.onIncrease,
    required this.onDecrease,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(
            '($cost)',
            style: const TextStyle(color: AppColors.steelGray, fontSize: 12),
          ),
          IconButton(onPressed: onDecrease, icon: const Icon(Icons.remove)),
          Text(
            value.toString(),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          IconButton(onPressed: onIncrease, icon: const Icon(Icons.add)),
        ],
      ),
    );
  }
}
