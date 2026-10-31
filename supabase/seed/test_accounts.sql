-- Test accounts for local play. Generated from supabase/seed/roster.json.
-- Regenerate with: node scripts/render-test-seed.mjs
-- Smith applies this file. Do not point it at a hosted database from CI.
-- Emails are @example.test only. No mail is sent. Character names only.
-- The shared password is the dev-only constant emc-dev-login.

-- ========== ROSTER DATA (generated; edit roster.json, then regenerate) ==========
-- Squad values are a placeholder test placement, not a canon assignment.

do $seed$
declare
  v_roster jsonb := $roster${
  "note": "Placeholder officer roster. Swap this file only, then run node scripts/render-test-seed.mjs. Squads are a placeholder test placement, not a canon assignment. Only final scores are stored. Base scores were not provided.",
  "staff": [
    { "label": "DM", "email": "dm@example.test", "role": "dm", "canApproveLore": false },
    { "label": "Curator", "email": "curator@example.test", "role": "dm", "canApproveLore": true }
  ],
  "characters": [
    {
      "name": "Alexandria",
      "email": "alexandria@example.test",
      "species": "elf",
      "lineage": "Wood Elf",
      "className": "Rogue",
      "level": 2,
      "background": "Charlatan",
      "squad": "RBM",
      "scores": { "strength": 8, "dexterity": 16, "constitution": 11, "intelligence": 14, "wisdom": 12, "charisma": 14 },
      "hp": 13,
      "ac": 14,
      "speed": 35,
      "saves": ["DEX", "INT"],
      "skills": ["Acrobatics", "Alchemy", "Deception", "History", "Insight", "Investigation", "Perception", "Survival", "Sleight of Hand", "Stealth"],
      "attacks": ["Dagger", "Shortbow", "Shortsword", "Unarmed Strike"],
      "features": ["Expertise", "Sneak Attack", "Thieves' Cant", "Weapon Mastery (Shortbow Vex, Shortsword Vex)", "Cunning Action", "Darkvision", "Elven Lineage (Wood Elf)", "Fey Ancestry", "Keen Senses", "Trance"],
      "spells": ["Druidcraft"],
      "feats": ["Skilled"],
      "seedFlags": []
    },
    {
      "name": "Aligher",
      "email": "aligher@example.test",
      "species": "halfling",
      "lineage": "",
      "className": "Rogue",
      "level": 2,
      "background": "Wayfarer",
      "squad": "CCC",
      "scores": { "strength": 8, "dexterity": 16, "constitution": 10, "intelligence": 12, "wisdom": 15, "charisma": 14 },
      "hp": 13,
      "ac": 14,
      "speed": 30,
      "saves": ["DEX", "INT"],
      "skills": ["Deception", "Insight", "Perception", "Stealth", "Investigation", "Sleight of Hand"],
      "attacks": ["Dagger", "Rapier", "Shortbow", "Unarmed Strike"],
      "features": ["Expertise", "Sneak Attack", "Thieves' Cant", "Weapon Mastery (Rapier Vex, Shortbow Vex)", "Cunning Action", "Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"],
      "spells": [],
      "feats": ["Lucky"],
      "seedFlags": []
    },
    {
      "name": "David",
      "email": "david@example.test",
      "species": "gnome",
      "lineage": "Forest Gnome",
      "className": "Druid",
      "level": 2,
      "background": "Wayfarer",
      "squad": "CCC",
      "scores": { "strength": 13, "dexterity": 16, "constitution": 12, "intelligence": 10, "wisdom": 16, "charisma": 8 },
      "hp": 15,
      "ac": 18,
      "speed": 30,
      "saves": ["INT", "WIS"],
      "skills": ["Insight", "Nature", "Stealth", "Survival"],
      "attacks": ["Heavy Crossbow", "Sickle", "Staff", "Unarmed Strike", "Shillelagh", "Wild Shape"],
      "features": ["Spellcasting", "Druidic", "Primal Order (Warden)", "Wild Shape", "Wild Companion", "Darkvision", "Gnomish Cunning", "Gnomish Lineage (Forest Gnome)"],
      "spells": ["Minor Illusion", "Shillelagh", "Spare the Dying", "Absorb Elements", "Cure Wounds", "Detect Poison and Disease", "Find Familiar", "Goodberry", "Speak with Animals", "Thunderwave"],
      "feats": ["Lucky"],
      "seedFlags": []
    },
    {
      "name": "Earl",
      "email": "earl@example.test",
      "species": "human",
      "lineage": "",
      "className": "Ranger",
      "level": 2,
      "background": "Wayfarer",
      "squad": "RBM",
      "scores": { "strength": 12, "dexterity": 16, "constitution": 15, "intelligence": 10, "wisdom": 14, "charisma": 8 },
      "hp": 24,
      "ac": 16,
      "speed": 30,
      "saves": ["STR", "DEX"],
      "skills": ["Athletics", "Insight", "Nature", "Perception", "Survival", "Stealth"],
      "attacks": ["Dagger", "Scimitar", "Shortbow", "Shortsword", "Unarmed Strike"],
      "features": ["Spellcasting", "Favored Enemy", "Weapon Mastery (Shortbow Vex, Scimitar Nick)", "Deft Explorer", "Fighting Style", "Resourceful", "Skillful", "Versatile"],
      "spells": ["Goodberry", "Hunter's Mark", "Longstrider"],
      "feats": ["Tough", "Archery", "Lucky"],
      "seedFlags": []
    },
    {
      "name": "Jadross",
      "email": "jadross@example.test",
      "species": "goliath",
      "lineage": "Stone Giant",
      "className": "Barbarian",
      "level": 2,
      "background": "Soldier",
      "squad": "CCC",
      "scores": { "strength": 16, "dexterity": 14, "constitution": 15, "intelligence": 12, "wisdom": 8, "charisma": 10 },
      "hp": 23,
      "ac": 14,
      "speed": 35,
      "saves": ["STR", "CON"],
      "skills": ["Acrobatics", "Athletics", "Intimidation", "Medicine"],
      "attacks": ["Dart", "Electrified Longsword +1", "Greataxe", "Handaxe", "Unarmed Strike"],
      "features": ["Rage", "Unarmored Defense", "Weapon Mastery (Greataxe Cleave, Longsword Sap)", "Danger Sense", "Reckless Attack", "Giant Ancestry (Stone's Endurance)", "Powerful Build"],
      "spells": [],
      "feats": ["Savage Attacker"],
      "seedFlags": []
    },
    {
      "name": "Valthar Brightlance",
      "email": "valthar@example.test",
      "species": "human",
      "lineage": "",
      "className": "Paladin",
      "level": 2,
      "background": "Farmer",
      "squad": "RBM",
      "scores": { "strength": 16, "dexterity": 14, "constitution": 14, "intelligence": 8, "wisdom": 10, "charisma": 13 },
      "hp": 24,
      "ac": 18,
      "speed": 30,
      "saves": ["WIS", "CHA"],
      "skills": ["Animal Handling", "Athletics", "Medicine", "Nature", "Persuasion"],
      "attacks": ["Electrified Longsword +1", "Javelin", "Warhammer", "Unarmed Strike"],
      "features": ["Lay On Hands", "Spellcasting", "Weapon Mastery (Warhammer Push, Longsword Sap)", "Fighting Style (Protection)", "Paladin's Smite", "Resourceful", "Skillful", "Versatile"],
      "spells": ["Compelled Duel", "Divine Smite", "Heroism", "Thunderous Smite"],
      "feats": ["Savage Attacker", "Protection", "Tough"],
      "seedFlags": []
    }
  ]
}$roster$::jsonb;
  v_row jsonb;
  v_id uuid;
  v_character uuid;
  v_squad uuid;
  v_guild uuid := '11111111-1111-4111-8111-111111111111';
  v_has_pw boolean;
  v_flags text[];
  v_sheet jsonb;
  v_hash text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'encrypted_password'
  ) into v_has_pw;

  if v_has_pw then
    if exists (select 1 from pg_namespace where nspname = 'extensions') then
      execute 'select extensions.crypt($1, extensions.gen_salt(''bf''))' into v_hash using 'emc-dev-login';
    else
      execute 'select crypt($1, gen_salt(''bf''))' into v_hash using 'emc-dev-login';
    end if;
  end if;

  for v_row in
    select value from jsonb_array_elements(v_roster->'staff')
    union all
    select value from jsonb_array_elements(v_roster->'characters')
  loop
    if (v_row->>'email') not like '%@example.test' then
      raise exception 'Refusing a test email outside @example.test';
    end if;
    select id into v_id from auth.users where email = v_row->>'email';
    if v_id is null then
      v_id := gen_random_uuid();
      if v_has_pw then
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          is_sso_user, is_anonymous
        ) values (
          '00000000-0000-0000-0000-000000000000',
          v_id,
          'authenticated',
          'authenticated',
          v_row->>'email',
          v_hash,
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('name', coalesce(v_row->>'name', v_row->>'label')),
          now(),
          now(),
          '', '', '', '',
          false,
          false
        );
        if exists (
          select 1 from information_schema.tables
          where table_schema = 'auth' and table_name = 'identities'
        ) then
          insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
          values (
            gen_random_uuid(),
            v_id,
            jsonb_build_object('sub', v_id::text, 'email', v_row->>'email'),
            'email',
            v_id::text,
            now(), now(), now()
          );
        end if;
      else
        insert into auth.users (id, email, raw_user_meta_data)
        values (
          v_id,
          v_row->>'email',
          jsonb_build_object('name', coalesce(v_row->>'name', v_row->>'label'))
        );
      end if;
    end if;
  end loop;

  perform set_config('emc.profile_admin', 'on', true);
  update public.profiles
  set app_role = 'dm', can_approve_lore = false
  where email = 'dm@example.test';
  update public.profiles
  set app_role = 'dm', can_approve_lore = true
  where email = 'curator@example.test';
  perform set_config('emc.profile_admin', 'off', true);

  for v_row in select value from jsonb_array_elements(v_roster->'characters')
  loop
    select id into v_id from auth.users where email = v_row->>'email';
    if v_id is null then
      raise exception 'Missing test user %', v_row->>'email';
    end if;
    perform set_config('request.jwt.claim.sub', v_id::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    if not exists (select 1 from public.characters where user_id = v_id) then
      perform public.create_character(
        v_row->>'name',
        v_row->>'background',
        v_row->>'background',
        'smith',
        'athletics',
        v_row->>'species',
        10, 9, 8, 8, 8, 8
      );
    end if;

    select id into v_squad
    from public.squads
    where guild_id = v_guild and name = v_row->>'squad'
    limit 1;
    if v_squad is null then
      raise exception 'Placeholder squad % is missing', v_row->>'squad';
    end if;

    -- Final scores are stored even when they miss the recruit starting-array check.
    -- seedFlags stays empty unless a roster row names something John has not approved.
    v_flags := coalesce(array(select jsonb_array_elements_text(v_row->'seedFlags')), array[]::text[]);

    v_sheet := jsonb_build_object(
      'hp', v_row->'hp',
      'ac', v_row->'ac',
      'speed', v_row->'speed',
      'saves', v_row->'saves',
      'skills', v_row->'skills',
      'attacks', v_row->'attacks',
      'features', v_row->'features',
      'spells', v_row->'spells',
      'feats', v_row->'feats',
      'lineage', v_row->'lineage'
    );

    perform set_config('emc.progression_write', 'on', true);
    perform set_config('emc.staff_write', 'on', true);
    update public.characters
    set strength = (v_row#>>'{scores,strength}')::int,
        dexterity = (v_row#>>'{scores,dexterity}')::int,
        constitution = (v_row#>>'{scores,constitution}')::int,
        intelligence = (v_row#>>'{scores,intelligence}')::int,
        wisdom = (v_row#>>'{scores,wisdom}')::int,
        charisma = (v_row#>>'{scores,charisma}')::int,
        level = (v_row->>'level')::int,
        class = v_row->>'className',
        squad_id = v_squad,
        inducted_at = coalesce(inducted_at, now()),
        sheet = v_sheet,
        seed_flags = v_flags
    where user_id = v_id;
    perform set_config('emc.progression_write', 'off', true);
    perform set_config('emc.staff_write', 'off', true);
  end loop;
end
$seed$;
