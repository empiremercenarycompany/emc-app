import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/character_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/starting_array.dart';
import '../../../services/supabase_service.dart';

class CharacterCreationView extends ConsumerStatefulWidget {
  const CharacterCreationView({super.key});

  @override
  ConsumerState<CharacterCreationView> createState() =>
      _CharacterCreationViewState();
}

class _CharacterCreationViewState extends ConsumerState<CharacterCreationView> {
  final _nameController = TextEditingController();
  final _originController = TextEditingController();
  final _professionController = TextEditingController();
  final _raceController = TextEditingController();
  final _picker = ImagePicker();

  String _arrayType = '10_9';
  int _strength = 10;
  int _dexterity = 9;
  int _constitution = 8;
  int _intelligence = 8;
  int _wisdom = 8;
  int _charisma = 8;
  Uint8List? _portraitBytes;
  String? _portraitName;
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _originController.dispose();
    _professionController.dispose();
    _raceController.dispose();
    super.dispose();
  }

  void _selectArray(String type) {
    setState(() {
      _arrayType = type;
      if (type == '10_9') {
        _strength = 10;
        _dexterity = 9;
        _constitution = 8;
        _intelligence = 8;
        _wisdom = 8;
        _charisma = 8;
      } else {
        _strength = 9;
        _dexterity = 9;
        _constitution = 9;
        _intelligence = 8;
        _wisdom = 8;
        _charisma = 8;
      }
    });
  }

  Future<void> _pickPortrait() async {
    final picked =
        await _picker.pickImage(source: ImageSource.gallery, maxWidth: 512);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _portraitBytes = bytes;
      _portraitName = picked.name;
    });
  }

  Future<void> _create() async {
    final name = _nameController.text.trim();
    final origin = _originController.text.trim();
    final profession = _professionController.text.trim();

    if (name.isEmpty || origin.isEmpty || profession.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Name, origin word, and profession are required.')),
      );
      return;
    }

    if (!StartingArray.isValid(
      strength: _strength,
      dexterity: _dexterity,
      constitution: _constitution,
      intelligence: _intelligence,
      wisdom: _wisdom,
      charisma: _charisma,
    )) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That starting array is not legal.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final characterId = await SupabaseService.createCharacter(
        name: name,
        originWord: origin,
        profession: profession,
        race: _raceController.text.trim().isEmpty
            ? null
            : _raceController.text.trim(),
        strength: _strength,
        dexterity: _dexterity,
        constitution: _constitution,
        intelligence: _intelligence,
        wisdom: _wisdom,
        charisma: _charisma,
      );

      var portraitFailed = false;
      if (characterId != null && _portraitBytes != null) {
        try {
          await SupabaseService.uploadCharacterPortrait(
            characterId: characterId,
            bytes: _portraitBytes!,
            fileName: _portraitName ?? 'portrait.jpg',
          );
        } catch (_) {
          portraitFailed = true;
        }
      }

      ref.invalidate(characterProvider);
      if (mounted) {
        if (portraitFailed) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Character created. Portrait upload failed.')),
          );
        }
        context.go('/');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create character: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Create Character'),
        backgroundColor: AppColors.ironBlack,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: GestureDetector(
              onTap: _pickPortrait,
              child: CircleAvatar(
                radius: 56,
                backgroundColor: AppColors.steelGray,
                backgroundImage: _portraitBytes != null
                    ? MemoryImage(_portraitBytes!)
                    : null,
                child: _portraitBytes == null
                    ? const Icon(Icons.add_a_photo,
                        size: 32, color: AppColors.parchmentWhite)
                    : null,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text('Tap to add portrait',
                style: TextStyle(color: AppColors.steelGray)),
          ),
          const SizedBox(height: 24),
          const Text('STARTING ARRAY',
              style: TextStyle(
                  color: AppColors.weatheredBronze, letterSpacing: 1.2)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                  child: _ArrayOption(
                title: '10 / 9',
                subtitle: 'One peak',
                selected: _arrayType == '10_9',
                onTap: () => _selectArray('10_9'),
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: _ArrayOption(
                title: 'Three 9s',
                subtitle: 'Balanced',
                selected: _arrayType == 'three_9',
                onTap: () => _selectArray('three_9'),
              )),
            ],
          ),
          const SizedBox(height: 16),
          _AttributePreview(
            strength: _strength,
            dexterity: _dexterity,
            constitution: _constitution,
            intelligence: _intelligence,
            wisdom: _wisdom,
            charisma: _charisma,
          ),
          const SizedBox(height: 24),
          TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Character Name')),
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
              decoration: const InputDecoration(labelText: 'Race (optional)')),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _loading ? null : _create,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.mercenaryRed,
              foregroundColor: AppColors.parchmentWhite,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: _loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Sign the Recruit Oath'),
          ),
        ],
      ),
    );
  }
}

class _ArrayOption extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _ArrayOption({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF1A1A1A),
          border: Border.all(
            color: selected ? AppColors.mercenaryRed : AppColors.steelGray,
            width: selected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            Text(subtitle,
                style:
                    const TextStyle(color: AppColors.steelGray, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _AttributePreview extends StatelessWidget {
  final int strength, dexterity, constitution, intelligence, wisdom, charisma;

  const _AttributePreview({
    required this.strength,
    required this.dexterity,
    required this.constitution,
    required this.intelligence,
    required this.wisdom,
    required this.charisma,
  });

  @override
  Widget build(BuildContext context) {
    final attrs = [
      ('STR', strength),
      ('DEX', dexterity),
      ('CON', constitution),
      ('INT', intelligence),
      ('WIS', wisdom),
      ('CHA', charisma),
    ];

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.8,
      children: attrs
          .map((a) => Container(
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A1A),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(a.$1,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.steelGray)),
                    Text(a.$2.toString(),
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
              ))
          .toList(),
    );
  }
}
