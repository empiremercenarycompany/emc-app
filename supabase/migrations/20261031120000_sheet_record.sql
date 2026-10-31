-- Optional recorded combat card for a character. Null keeps the recruit formulas.
-- seed_flags records rule conflicts as they are. The seed does not correct them.

alter table public.characters
  add column sheet jsonb,
  add column seed_flags text[] not null default '{}';

comment on column public.characters.sheet is
  'Optional card: hp, ac, speed, saves, skills, attacks, features, spells, feats, lineage. Null uses the recruit formulas.';

comment on column public.characters.seed_flags is
  'Rule conflicts recorded as-is for the DM. The app does not correct them.';
