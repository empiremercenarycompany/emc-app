import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config/supabase_config.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;

  static User? get currentUser => client.auth.currentUser;

  static bool get isConfigured => SupabaseConfig.isConfigured;

  static Stream<AuthState> get authStateChanges =>
      client.auth.onAuthStateChange;

  static Future<Map<String, dynamic>?> fetchCharacter() async {
    final userId = currentUser?.id;
    if (userId == null) return null;
    return await client
        .from('characters')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
  }

  static Future<String?> createCharacter({
    required String name,
    required String originWord,
    required String profession,
    String? race,
    required int strength,
    required int dexterity,
    required int constitution,
    required int intelligence,
    required int wisdom,
    required int charisma,
  }) async {
    final response = await client.rpc('create_character', params: {
      'p_name': name,
      'p_origin_word': originWord,
      'p_profession': profession,
      'p_race': race,
      'p_strength': strength,
      'p_dexterity': dexterity,
      'p_constitution': constitution,
      'p_intelligence': intelligence,
      'p_wisdom': wisdom,
      'p_charisma': charisma,
    });

    return response as String?;
  }

  /// Uploads a portrait into the `character-portraits` bucket.
  ///
  /// Storage RLS expects the first folder to be the auth user id.
  static Future<String> uploadCharacterPortrait({
    required String characterId,
    required Uint8List bytes,
    required String fileName,
  }) async {
    final userId = currentUser?.id;
    if (userId == null) {
      throw StateError('Not authenticated');
    }

    final extension = _imageExtension(fileName);
    final path = '$userId/$characterId.$extension';
    await client.storage.from('character-portraits').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            upsert: true,
            contentType: _imageContentType(extension),
          ),
        );

    final url = client.storage.from('character-portraits').getPublicUrl(path);
    await client
        .from('characters')
        .update({'portrait_url': url}).eq('id', characterId);
    return url;
  }

  static String _imageExtension(String fileName) {
    final dot = fileName.lastIndexOf('.');
    if (dot == -1 || dot == fileName.length - 1) return 'jpg';
    final extension = fileName.substring(dot + 1).toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return extension;
      default:
        return 'jpg';
    }
  }

  static String _imageContentType(String extension) {
    switch (extension) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  static Future<void> updateCharacter({
    required String characterId,
    String? name,
    String? originWord,
    String? profession,
    String? race,
    int? strength,
    int? dexterity,
    int? constitution,
    int? intelligence,
    int? wisdom,
    int? charisma,
    int? attributePoints,
  }) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (originWord != null) updates['origin_word'] = originWord;
    if (profession != null) updates['profession'] = profession;
    if (race != null) updates['race'] = race;
    if (strength != null) updates['strength'] = strength;
    if (dexterity != null) updates['dexterity'] = dexterity;
    if (constitution != null) updates['constitution'] = constitution;
    if (intelligence != null) updates['intelligence'] = intelligence;
    if (wisdom != null) updates['wisdom'] = wisdom;
    if (charisma != null) updates['charisma'] = charisma;
    if (attributePoints != null) updates['attribute_points'] = attributePoints;
    if (updates.isEmpty) return;
    await client.from('characters').update(updates).eq('id', characterId);
  }

  static Future<void> awardAttributePoints({
    required String characterId,
    required int points,
    required String source,
    String? reason,
  }) async {
    await client.rpc('award_attribute_points', params: {
      'p_character_id': characterId,
      'p_points': points,
      'p_source': source,
      'p_reason': reason,
    });
  }

  static Future<List<Map<String, dynamic>>> fetchMissions() async {
    final userId = currentUser?.id;
    if (userId == null) return [];
    final membership = await client
        .from('guild_memberships')
        .select('guild_id')
        .eq('user_id', userId)
        .maybeSingle();
    if (membership == null) return [];
    final response = await client
        .from('missions')
        .select()
        .eq('guild_id', membership['guild_id'])
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(response);
  }

  static Future<void> logWorkout({
    required String characterId,
    required String type,
    required String exercise,
    int? sets,
    int? reps,
    String? notes,
  }) async {
    await client.from('workout_logs').insert({
      'character_id': characterId,
      'type': type,
      'exercise': exercise,
      'sets': sets,
      'reps': reps,
      'notes': notes,
    });
  }

  static Future<void> checkInToSession({
    required String sessionId,
    required String characterId,
  }) async {
    await client.from('session_attendance').upsert({
      'session_id': sessionId,
      'character_id': characterId,
      'loot_share': true,
    });
  }

  static Future<List<Map<String, dynamic>>> fetchGoals() async {
    final character = await fetchCharacter();
    if (character == null) return [];
    final response = await client
        .from('goals')
        .select()
        .eq('character_id', character['id'])
        .eq('is_active', true)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(response);
  }
}
