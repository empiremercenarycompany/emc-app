import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/utils/attribute_pools.dart';
import '../../../services/supabase_service.dart';

class Character {
  final String id;
  final String name;
  final String rank;
  final int level;
  final String? originWord;
  final String? profession;
  final String? race;
  final String? characterClass;
  final String? portraitUrl;
  final int strength;
  final int dexterity;
  final int constitution;
  final int intelligence;
  final int wisdom;
  final int charisma;
  final int physicalPoints;
  final int constitutionPoints;
  final int mentalPoints;

  const Character({
    required this.id,
    required this.name,
    required this.rank,
    required this.level,
    this.originWord,
    this.profession,
    this.race,
    this.characterClass,
    this.portraitUrl,
    required this.strength,
    required this.dexterity,
    required this.constitution,
    required this.intelligence,
    required this.wisdom,
    required this.charisma,
    required this.physicalPoints,
    required this.constitutionPoints,
    required this.mentalPoints,
  });

  AbilityScores get scores => AbilityScores(
        strength: strength,
        dexterity: dexterity,
        constitution: constitution,
        intelligence: intelligence,
        wisdom: wisdom,
        charisma: charisma,
      );

  PoolBalances get pools => PoolBalances(
        physical: physicalPoints,
        constitution: constitutionPoints,
        mental: mentalPoints,
      );

  factory Character.fromMap(Map<String, dynamic> map) {
    return Character(
      id: map['id'] as String,
      name: map['name'] as String? ?? 'Recruit',
      rank: map['rank'] as String? ?? 'Recruit',
      level: map['level'] as int? ?? 1,
      originWord: map['origin_word'] as String?,
      profession: map['profession'] as String?,
      race: map['race'] as String?,
      characterClass: map['class'] as String?,
      portraitUrl: map['portrait_url'] as String?,
      strength: map['strength'] as int? ?? 8,
      dexterity: map['dexterity'] as int? ?? 8,
      constitution: map['constitution'] as int? ?? 8,
      intelligence: map['intelligence'] as int? ?? 8,
      wisdom: map['wisdom'] as int? ?? 8,
      charisma: map['charisma'] as int? ?? 8,
      physicalPoints: map['physical_points'] as int? ?? 0,
      constitutionPoints: map['constitution_points'] as int? ?? 0,
      mentalPoints: map['mental_points'] as int? ?? 0,
    );
  }
}

final characterProvider = FutureProvider<Character?>((ref) async {
  // Refetch when the session changes so a pre-login null is not cached.
  final auth = ref.watch(authStateProvider);
  if (auth.asData?.value.session == null) return null;

  final data = await SupabaseService.fetchCharacter();
  if (data == null) return null;
  return Character.fromMap(data);
});
