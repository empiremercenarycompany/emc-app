do $$
begin
  if (select count(*) from public.recruit_backgrounds where enabled) <> 12 then
    raise exception 'expected 12 recruitment backgrounds';
  end if;
  if exists (
    select 1 from public.recruit_backgrounds
    where origin_feat ilike '%magic initiate%'
       or id in ('acolyte', 'guide', 'sage')
  ) then
    raise exception 'a Magic Initiate background is offered';
  end if;
  if (select tool_options[1] from public.recruit_backgrounds where id = 'farmer') is distinct from 'carpenter' then
    raise exception 'farmer tool drifted';
  end if;
  if cardinality((select tool_options from public.recruit_backgrounds where id = 'artisan')) < 2 then
    raise exception 'artisan should offer a tool choice';
  end if;
end $$;
