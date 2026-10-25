import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/character_provider.dart';
import '../../../core/theme/app_theme.dart';
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

  int _strength = 8;
  int _dexterity = 8;
  int _constitution = 8;
  int _intelligence = 8;
  int _wisdom = 8;
  int _charisma = 8;
  int _unspent = 0;
  String? _characterId;
  bool _loading = false;

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
      _strength = character.strength;
      _dexterity = character.dexterity;
      _constitution = character.constitution;
      _intelligence = character.intelligence;
      _wisdom = character.wisdom;
      _charisma = character.charisma;
      _unspent = character.unspentPoints;
    });
  }

  int get _totalCost => PointBuy.totalCost(
        strength: _strength,
        dexterity: _dexterity,
        constitution: _constitution,
        intelligence: _intelligence,
        wisdom: _wisdom,
        charisma: _charisma,
      );

  Future<void> _save() async {
    if (_characterId == null) return;

    setState(() => _loading = true);
    try {
      await SupabaseService.updateCharacter(
        characterId: _characterId!,
        name: _nameController.text.trim(),
        originWord: _originController.text.trim(),
        profession: _professionController.text.trim(),
        race: _raceController.text.trim(),
        strength: _strength,
        dexterity: _dexterity,
        constitution: _constitution,
        intelligence: _intelligence,
        wisdom: _wisdom,
        charisma: _charisma,
        attributePoints: _unspent,
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

  void _adjustAttribute(String attr, int delta) {
    setState(() {
      int current = 0;
      switch (attr) {
        case 'str':
          current = _strength;
          break;
        case 'dex':
          current = _dexterity;
          break;
        case 'con':
          current = _constitution;
          break;
        case 'int':
          current = _intelligence;
          break;
        case 'wis':
          current = _wisdom;
          break;
        case 'cha':
          current = _charisma;
          break;
      }

      final next = current + delta;
      if (next < 8 || next > 15) return;

      final costDelta = PointBuy.costFor(next) - PointBuy.costFor(current);
      if (_unspent - costDelta < 0) return;

      switch (attr) {
        case 'str':
          _strength = next;
          break;
        case 'dex':
          _dexterity = next;
          break;
        case 'con':
          _constitution = next;
          break;
        case 'int':
          _intelligence = next;
          break;
        case 'wis':
          _wisdom = next;
          break;
        case 'cha':
          _charisma = next;
          break;
      }
      _unspent -= costDelta;
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
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Name')),
          const SizedBox(height: 12),
          TextField(
              controller: _originController,
              decoration: const InputDecoration(labelText: 'Origin Word')),
          const SizedBox(height: 12),
          TextField(
              controller: _professionController,
              decoration: const InputDecoration(labelText: 'Profession')),
          const SizedBox(height: 12),
          TextField(
              controller: _raceController,
              decoration: const InputDecoration(labelText: 'Race')),
          const SizedBox(height: 24),
          Text('Unspent Points: $_unspent',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: AppColors.weatheredBronze)),
          Text('Total Cost: $_totalCost',
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
          _AttributeEditor(
              label: 'Strength',
              value: _strength,
              cost: PointBuy.costFor(_strength),
              onIncrease: () => _adjustAttribute('str', 1),
              onDecrease: () => _adjustAttribute('str', -1)),
          _AttributeEditor(
              label: 'Dexterity',
              value: _dexterity,
              cost: PointBuy.costFor(_dexterity),
              onIncrease: () => _adjustAttribute('dex', 1),
              onDecrease: () => _adjustAttribute('dex', -1)),
          _AttributeEditor(
              label: 'Constitution',
              value: _constitution,
              cost: PointBuy.costFor(_constitution),
              onIncrease: () => _adjustAttribute('con', 1),
              onDecrease: () => _adjustAttribute('con', -1)),
          _AttributeEditor(
              label: 'Intelligence',
              value: _intelligence,
              cost: PointBuy.costFor(_intelligence),
              onIncrease: () => _adjustAttribute('int', 1),
              onDecrease: () => _adjustAttribute('int', -1)),
          _AttributeEditor(
              label: 'Wisdom',
              value: _wisdom,
              cost: PointBuy.costFor(_wisdom),
              onIncrease: () => _adjustAttribute('wis', 1),
              onDecrease: () => _adjustAttribute('wis', -1)),
          _AttributeEditor(
              label: 'Charisma',
              value: _charisma,
              cost: PointBuy.costFor(_charisma),
              onIncrease: () => _adjustAttribute('cha', 1),
              onDecrease: () => _adjustAttribute('cha', -1)),
        ],
      ),
    );
  }
}

class _AttributeEditor extends StatelessWidget {
  final String label;
  final int value;
  final int cost;
  final VoidCallback onIncrease;
  final VoidCallback onDecrease;

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
          Text('($cost)',
              style: const TextStyle(color: AppColors.steelGray, fontSize: 12)),
          IconButton(onPressed: onDecrease, icon: const Icon(Icons.remove)),
          Text(value.toString(),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          IconButton(onPressed: onIncrease, icon: const Icon(Icons.add)),
        ],
      ),
    );
  }
}
