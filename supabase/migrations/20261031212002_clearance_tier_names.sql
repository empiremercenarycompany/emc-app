-- Clearance names. Civic honors. Depth thresholds stay as they are.
-- Unlock text stays empty. This does not rename a person.

alter table public.compliance_tiers
  add column if not exists label text not null default '';

comment on column public.compliance_tiers.label is
  'Player-facing Clearance name. Depth rows stay blank. Unlock text is a separate column.';

delete from public.compliance_tiers where kind = 'clearance';

insert into public.compliance_tiers (id, kind, threshold, label, unlocks) values
  ('clearance-4', 'clearance', 4, 'Known', ''),
  ('clearance-10', 'clearance', 10, 'Trusted', ''),
  ('clearance-20', 'clearance', 20, 'Vouched For', ''),
  ('clearance-36', 'clearance', 36, 'Honored', ''),
  ('clearance-52', 'clearance', 52, 'Esteemed of Bleakspire', '');

comment on table public.compliance_tiers is
  'Clearance weeks are 4, 10, 20, 36, and 52. Pillar of Bleakspire starts 26 weeks after week 52 and repeats every 26 weeks. The app numbers the repeats. Depth thresholds are unchanged.';
