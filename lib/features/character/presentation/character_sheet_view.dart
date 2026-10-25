import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/character_provider.dart';
import '../../../core/theme/app_theme.dart';

class CharacterSheetView extends ConsumerWidget {
  const CharacterSheetView({super.key});

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
        error: (err, _) => Center(child: Text('Failed to load sheet.\n$err')),
        data: (character) {
          if (character == null) {
            return const Center(child: Text('No character found.'));
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Header(character: character),
              const SizedBox(height: 24),
              _SectionTitle('Attributes'),
              _AttributeGrid(character: character),
              const SizedBox(height: 16),
              _PointsCard(points: character.unspentPoints),
              const SizedBox(height: 24),
              _SectionTitle('Background'),
              _InfoRow(
                  label: 'Origin Word', value: character.originWord ?? '—'),
              _InfoRow(label: 'Profession', value: character.profession ?? '—'),
              _InfoRow(label: 'Race', value: character.race ?? '—'),
              const SizedBox(height: 24),
              _SectionTitle('Status'),
              _InfoRow(label: 'Rank', value: character.rank),
              _InfoRow(label: 'Level', value: character.level.toString()),
              _InfoRow(
                  label: 'Class',
                  value: character.characterClass ?? 'Not yet inducted'),
              const SizedBox(height: 32),
              if (character.characterClass == null)
                const Text(
                  'Class selection opens at Week 6.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.steelGray),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final Character character;
  const _Header({required this.character});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CircleAvatar(
          radius: 56,
          backgroundColor: AppColors.steelGray,
          backgroundImage: character.portraitUrl != null
              ? CachedNetworkImageProvider(character.portraitUrl!)
              : null,
          child: character.portraitUrl == null
              ? const Icon(Icons.person,
                  size: 48, color: AppColors.parchmentWhite)
              : null,
        ),
        const SizedBox(height: 12),
        Text(character.name, style: Theme.of(context).textTheme.headlineMedium),
        Text(
          '${character.rank} · Level ${character.level}',
          style: Theme.of(context)
              .textTheme
              .bodyLarge
              ?.copyWith(color: AppColors.mercenaryRed),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

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

class _AttributeGrid extends StatelessWidget {
  final Character character;
  const _AttributeGrid({required this.character});

  @override
  Widget build(BuildContext context) {
    final attrs = [
      ('STR', character.strength),
      ('DEX', character.dexterity),
      ('CON', character.constitution),
      ('INT', character.intelligence),
      ('WIS', character.wisdom),
      ('CHA', character.charisma),
    ];

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.6,
      children: attrs.map((a) => _AttrBox(label: a.$1, value: a.$2)).toList(),
    );
  }
}

class _AttrBox extends StatelessWidget {
  final String label;
  final int value;
  const _AttrBox({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1A),
        border: Border.all(color: AppColors.steelGray),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 12, color: AppColors.steelGray)),
          Text(value.toString(),
              style:
                  const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _PointsCard extends StatelessWidget {
  final int points;
  const _PointsCard({required this.points});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF1A1A1A),
      child: ListTile(
        title: const Text('Unspent Points'),
        trailing: Text(
          points.toString(),
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(color: AppColors.weatheredBronze),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.steelGray)),
          Text(value),
        ],
      ),
    );
  }
}
