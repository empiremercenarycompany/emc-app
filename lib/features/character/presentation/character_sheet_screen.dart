import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/character_provider.dart';
import '../../../core/theme/app_theme.dart';

class CharacterSheetScreen extends ConsumerWidget {
  const CharacterSheetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final characterAsync = ref.watch(characterProvider);

    return Scaffold(
      backgroundColor: AppColors.ironBlack,
      appBar: AppBar(
        title: const Text('Character Sheet'),
        backgroundColor: AppColors.ironBlack,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.go('/character/edit'),
          ),
        ],
      ),
      body: characterAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.mercenaryRed)),
        error: (err, stack) =>
            Center(child: Text('Failed to load character.\n$err')),
        data: (character) {
          if (character == null) {
            return const Center(
                child: Text('No character found. Create one to begin.'));
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: Column(
                  children: [
                    const CircleAvatar(
                      radius: 48,
                      backgroundColor: AppColors.steelGray,
                      child: Icon(Icons.person,
                          size: 48, color: AppColors.parchmentWhite),
                    ),
                    const SizedBox(height: 12),
                    Text(character.name,
                        style: Theme.of(context).textTheme.headlineMedium),
                    Text(
                      '${character.rank} · Level ${character.level}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.mercenaryRed,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Origin: ${character.originWord ?? '—'} · Profession: ${character.profession ?? '—'}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (character.characterClass != null)
                      Text('Class: ${character.characterClass}'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              _AttributeRow(label: 'Strength', value: character.strength),
              _AttributeRow(label: 'Dexterity', value: character.dexterity),
              _AttributeRow(
                  label: 'Constitution', value: character.constitution),
              _AttributeRow(
                  label: 'Intelligence', value: character.intelligence),
              _AttributeRow(label: 'Wisdom', value: character.wisdom),
              _AttributeRow(label: 'Charisma', value: character.charisma),
              const SizedBox(height: 16),
              Card(
                color: const Color(0xFF1A1A1A),
                child: Column(
                  children: [
                    _PoolRow(
                        label: 'Physical',
                        hint: 'STR / DEX',
                        points: character.physicalPoints),
                    _PoolRow(
                        label: 'Constitution',
                        hint: 'CON',
                        points: character.constitutionPoints),
                    _PoolRow(
                        label: 'Mental',
                        hint: 'INT / WIS / CHA',
                        points: character.mentalPoints),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                character.characterClass == null
                    ? 'Class selection opens at Week 6.'
                    : 'Class locked. Continue training.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.steelGray,
                    ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PoolRow extends StatelessWidget {
  final String label;
  final String hint;
  final int points;

  const _PoolRow({
    required this.label,
    required this.hint,
    required this.points,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      title: Text(label),
      subtitle: Text(hint),
      trailing: Text(
        points.toString(),
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppColors.weatheredBronze,
            ),
      ),
    );
  }
}

class _AttributeRow extends StatelessWidget {
  final String label;
  final int value;

  const _AttributeRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value.toString(),
            style: const TextStyle(
              color: AppColors.parchmentWhite,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
