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

  /// Profile fields only. Scores and pool balances go through the spend and
  /// award functions, which the database will not let a direct update change.
  static Future<void> updateCharacter({
    required String characterId,
    String? name,
    String? originWord,
    String? profession,
    String? race,
  }) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (originWord != null) updates['origin_word'] = originWord;
    if (profession != null) updates['profession'] = profession;
    if (race != null) updates['race'] = race;
    if (updates.isEmpty) return;
    await client.from('characters').update(updates).eq('id', characterId);
  }

  /// Returns the points actually added. Zero means the award was already
  /// recorded, or a workout hit the weekly cap. The cap does not remove points.
  static Future<int> awardAttributePoints({
    required String characterId,
    required int points,
    required String source,
    required String pool,
    String? reason,
    String? sourceId,
  }) async {
    final response = await client.rpc('award_attribute_points', params: {
      'p_character_id': characterId,
      'p_points': points,
      'p_source': source,
      'p_pool': pool,
      'p_reason': reason,
      'p_source_id': sourceId,
    });
    return response as int? ?? 0;
  }

  static Future<void> spendAttributePoints({
    required String characterId,
    required int strength,
    required int dexterity,
    required int constitution,
    required int intelligence,
    required int wisdom,
    required int charisma,
  }) async {
    await client.rpc('spend_attribute_points', params: {
      'p_character_id': characterId,
      'p_strength': strength,
      'p_dexterity': dexterity,
      'p_constitution': constitution,
      'p_intelligence': intelligence,
      'p_wisdom': wisdom,
      'p_charisma': charisma,
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

  /// Saves the log and awards Physical points through the workout award rule.
  ///
  /// [pointsAwarded] is 1 or 0. Zero means this log was saved after today's
  /// Physical point was already claimed.
  static Future<({String logId, int pointsAwarded})> recordWorkout({
    required String characterId,
    required String type,
    required String exercise,
    int? sets,
    int? reps,
    String? notes,
  }) async {
    final response = await client.rpc('record_workout', params: {
      'p_character_id': characterId,
      'p_type': type,
      'p_exercise': exercise,
      'p_sets': sets,
      'p_reps': reps,
      'p_notes': notes,
    });
    final row = Map<String, dynamic>.from(response as Map);
    return (
      logId: row['log_id'] as String,
      pointsAwarded: row['points_awarded'] as int? ?? 0,
    );
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
