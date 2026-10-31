-- Clearance names. Depth thresholds stay put.

do $$
begin
  if (select count(*) from public.compliance_tiers where kind = 'clearance') <> 5 then
    raise exception 'clearance ladder changed size';
  end if;
  if (select label from public.compliance_tiers where id = 'clearance-4') is distinct from 'Known' then
    raise exception 'week 4 is not Known';
  end if;
  if (select label from public.compliance_tiers where id = 'clearance-10') is distinct from 'Trusted' then
    raise exception 'week 10 is not Trusted';
  end if;
  if (select label from public.compliance_tiers where id = 'clearance-20') is distinct from 'Vouched For' then
    raise exception 'week 20 is not Vouched For';
  end if;
  if (select label from public.compliance_tiers where id = 'clearance-36') is distinct from 'Honored' then
    raise exception 'week 36 is not Honored';
  end if;
  if (select label from public.compliance_tiers where id = 'clearance-52') is distinct from 'Esteemed of Bleakspire' then
    raise exception 'week 52 is not Esteemed of Bleakspire';
  end if;
  if exists (
    select 1 from public.compliance_tiers
    where kind = 'clearance' and threshold in (25, 50, 75, 100)
  ) then
    raise exception 'old clearance placeholders remain';
  end if;
  if (select threshold from public.compliance_tiers where id = 'depth-60') is distinct from 60
     or (select threshold from public.compliance_tiers where id = 'depth-100') is distinct from 100
     or (select label from public.compliance_tiers where id = 'depth-60') is distinct from '' then
    raise exception 'depth tiers changed';
  end if;
end $$;
