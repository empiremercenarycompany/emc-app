-- Placeholder config and SRD 5.2 names. No rules text is copied.
-- Attribution: System Reference Document 5.2 by Wizards of the Coast LLC,
-- licensed under Creative Commons Attribution 4.0 International.
-- https://creativecommons.org/licenses/by/4.0/

select set_config('emc.seed', 'on', false);

insert into public.guilds (id, name, slug, description)
values (
  '11111111-1111-4111-8111-111111111111',
  'Empire Mercenary Company',
  'emc',
  'The company.'
);

insert into public.scoring_config (
  id, time_zone, cohort_start, backfill_days, goal_backfill_days,
  points_per_prescribed_workout, points_per_custom_workout, points_per_lifting_session,
  points_per_goal, exercise_points_per_session, goal_points_per_session,
  session_length_days, first_adventure_sessions, point_buy_budget,
  point_buy_min, point_buy_max, squad_max_size, award_requires_approval,
  log_visibility, induction_week, adventure_weeks,
  level_after_adventure_1, level_after_adventure_2, veteran_tier_start_week,
  single_guild, share_lifting_default
) values (
  1, 'America/Denver', date '2027-01-04', 14, 14,
  1, 1, 1,
  1, 3, 3,
  14, 8, 27,
  8, 15, 6, false,
  'staff', 6, 16,
  2, 3, null,
  true, true
);

insert into public.point_buy_costs (score, cost) values
  (8, 0), (9, 1), (10, 2), (11, 3), (12, 4), (13, 5), (14, 7), (15, 9);

insert into public.staff_grant_roles (app_role) values ('dm'), ('admin'), ('curator');
insert into public.library_editor_roles (app_role) values ('admin'), ('curator');

insert into public.adventures (guild_id, number, title, start_date, weeks, status)
values (
  '11111111-1111-4111-8111-111111111111',
  1,
  'First adventure',
  date '2027-01-04',
  16,
  'upcoming'
);

insert into public.config_notes (key, note) values
  ('cohort_start', 'TODO(John): 2027-01-04 is a placeholder for the January 2027 cohort, the first Monday. Confirm the real first session date.'),
  ('squad_max_size', 'TODO(John): the marketing offer says 5 and the spec says 6. The default is 6.'),
  ('points_per_custom_workout', 'TODO(John): custom workouts earn the same 1 point as prescribed workouts until you say otherwise.'),
  ('goal_backfill_days', 'TODO(John): a goal completion uses the same 14-day window and counts toward the session of its date.'),
  ('point_buy_above_15', 'TODO(John): spends stop at 15. The score columns allow 20 so a later cost row can open them.'),
  ('background_bonus', 'Implemented: the starting 10 is already paid on the point-buy table, so 10 to 11 costs 1. The starting array''s 3 points count toward the 27.'),
  ('award_requires_approval', 'TODO(John): logs award immediately. Set award_requires_approval if a log should wait for staff.'),
  ('log_visibility', 'TODO(John): workout logs default to the owner plus staff in the same company. squad and company are available.'),
  ('staff_grant_roles', 'TODO(John): dm, admin, and curator may grant points and edit the schedule. A Captain rank does not. Grants must share the character''s guild.'),
  ('library_editors', 'TODO(John): admin and curator edit the workout library. The DM can unpublish.'),
  ('veteran_tier', 'TODO(John): the Veteran tier stays closed while veteran_tier_start_week is null.'),
  ('induction_classes', 'TODO(John): no class is enabled. Induction can be recorded without a class until you enable rows.'),
  ('ranks', 'TODO(John): Recruit, Sergeant, and Captain are placeholders. How a rank is earned is open.'),
  ('religion_skill', 'TODO(John): the Religion skill label stays Religion until you rename it.'),
  ('loot_share', 'TODO(John): attendance stores loot_share and does not grant anything else.'),
  ('group_goal_rewards', 'TODO(John): squad challenge progress is tracked. It does not award attribute points.'),
  ('leveling', 'TODO(John): level 2 and level 3 milestones are config only. A DM sets the level. Nothing levels automatically.'),
  ('single_guild', 'TODO(John): signup joins the one seeded company.'),
  ('auth_providers', 'TODO(John): magic link only. Discord and Google are not wired.'),
  ('corleone', 'TODO(John): Corleone is not bundled. Headings fall back to League Spartan until the web license is confirmed.'),
  ('origin_feat', 'TODO(John): the origin word is stored and is not mapped to a feat.'),
  ('pre_induction_combat', 'TODO(John): hit points and armor class for a pre-induction character are not calculated.'),
  ('schedule_gaps', 'TODO(John): one published cohort_sessions row turns the 14-day cadence off for every date the table does not list.'),
  ('lifting_menu', 'TODO(John): a player builds from a pool marked shared, or from a pool on a template assigned to them.'),
  ('lifting_reward', 'TODO(John): a flagged exercise stores reward_hook and does not grant attribute points.'),
  ('place_label', 'Do not invent a description of Bleakspire. John has not confirmed any label for the place.');

insert into public.rank_catalog (id, name, sort_order, notes) values
  ('recruit', 'Recruit', 1, 'TODO(John): starting rank.'),
  ('sergeant', 'Sergeant', 2, 'TODO(John): how this rank is earned.'),
  ('captain', 'Captain', 3, 'TODO(John): how this rank is earned. It is not a permission role.');

insert into public.induction_classes (id, name, enabled, notes) values
  ('fighter', 'Fighter', false, 'TODO(John): confirm this martial class before enabling it.'),
  ('barbarian', 'Barbarian', false, 'TODO(John): confirm this martial class before enabling it.'),
  ('monk', 'Monk', false, 'TODO(John): confirm this martial class before enabling it.'),
  ('rogue', 'Rogue', false, 'TODO(John): confirm this martial class before enabling it.');

insert into public.content_species (id, name, source, attribution) values
  ('dragonborn', 'Dragonborn', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('dwarf', 'Dwarf', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('elf', 'Elf', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('gnome', 'Gnome', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('goliath', 'Goliath', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('halfling', 'Halfling', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('human', 'Human', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('orc', 'Orc', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'),
  ('tiefling', 'Tiefling', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.');

insert into public.skill_labels (id, default_name, display_name, source, attribution, notes) values
  ('acrobatics', 'Acrobatics', 'Acrobatics', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('animal_handling', 'Animal Handling', 'Animal Handling', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('arcana', 'Arcana', 'Arcana', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('athletics', 'Athletics', 'Athletics', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('deception', 'Deception', 'Deception', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('history', 'History', 'History', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('insight', 'Insight', 'Insight', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('intimidation', 'Intimidation', 'Intimidation', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('investigation', 'Investigation', 'Investigation', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('medicine', 'Medicine', 'Medicine', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('nature', 'Nature', 'Nature', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('perception', 'Perception', 'Perception', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('performance', 'Performance', 'Performance', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('persuasion', 'Persuasion', 'Persuasion', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('religion', 'Religion', 'Religion', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', 'TODO(John): rename is open. The stored id stays religion.'),
  ('sleight_of_hand', 'Sleight of Hand', 'Sleight of Hand', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('stealth', 'Stealth', 'Stealth', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null),
  ('survival', 'Survival', 'Survival', 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.', null);

insert into public.profession_tools (id, name, source, attribution)
select id, name, 'srd-5.2', 'System Reference Document 5.2 by Wizards of the Coast LLC, CC BY 4.0.'
from (values
  ('alchemist', 'Alchemist''s supplies'),
  ('brewer', 'Brewer''s supplies'),
  ('calligrapher', 'Calligrapher''s supplies'),
  ('carpenter', 'Carpenter''s tools'),
  ('cartographer', 'Cartographer''s tools'),
  ('cobbler', 'Cobbler''s tools'),
  ('cook', 'Cook''s utensils'),
  ('glassblower', 'Glassblower''s tools'),
  ('jeweler', 'Jeweler''s tools'),
  ('leatherworker', 'Leatherworker''s tools'),
  ('mason', 'Mason''s tools'),
  ('painter', 'Painter''s supplies'),
  ('potter', 'Potter''s tools'),
  ('smith', 'Smith''s tools'),
  ('tinker', 'Tinker''s tools'),
  ('weaver', 'Weaver''s tools'),
  ('woodcarver', 'Woodcarver''s tools'),
  ('disguise', 'Disguise kit'),
  ('forgery', 'Forgery kit'),
  ('herbalism', 'Herbalism kit'),
  ('navigator', 'Navigator''s tools'),
  ('poisoner', 'Poisoner''s kit'),
  ('thieves', 'Thieves'' tools'),
  ('dice', 'Dice set'),
  ('cards', 'Playing card set'),
  ('drum', 'Drum'),
  ('flute', 'Flute'),
  ('horn', 'Horn'),
  ('lute', 'Lute'),
  ('lyre', 'Lyre'),
  ('vehicles_land', 'Vehicles (land)'),
  ('vehicles_water', 'Vehicles (water)')
) as tools(id, name);

select set_config('emc.seed', 'off', false);
