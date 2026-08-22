-- =============================================================
-- WEDORA — FINAL SAVE + PUBLISH HOTFIX (2026-08-22)
-- Run ONCE in Supabase > SQL Editor on the CURRENT project.
-- Safe for existing invitations/subscriptions. No DELETE/TRUNCATE.
-- Fixes:
--   1) "column reference status is ambiguous"
--   2) builder PATCH 406 / "Cannot coerce ... to a single JSON object"
-- =============================================================

begin;

create extension if not exists "pgcrypto";
grant usage on schema public to authenticated;
grant select on public.subscriptions, public.plans, public.invitations to authenticated;
grant insert, update on public.invitations to authenticated;

-- -------------------------------------------------------------
-- A. Compatibility fix for the already-deployed V10 publish RPC.
-- All table columns are explicitly qualified so PL/pgSQL never
-- confuses the output column named status with a table column.
-- -------------------------------------------------------------
create or replace function public.publish_invitation_v10(p_invitation_id uuid)
returns table(
  slug text,
  status public.invitation_status,
  active_until timestamptz,
  is_lifetime boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sub public.subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  if not exists (
    select 1
    from public.invitations as i0
    where i0.id = p_invitation_id
      and i0.user_id = auth.uid()
  ) then
    raise exception 'invitation not found for current account';
  end if;

  select s0.*
  into v_sub
  from public.subscriptions as s0
  where s0.user_id = auth.uid()
    and s0.status = 'active'::public.subscription_status
    and (
      s0.is_lifetime = true
      or (s0.current_period_end is not null and s0.current_period_end > now())
    )
  order by s0.is_lifetime desc,
           s0.updated_at desc nulls last,
           s0.started_at desc
  limit 1;

  if not found then
    raise exception 'active account subscription required';
  end if;

  update public.invitations as i1
  set status = 'active'::public.invitation_status,
      plan_id = v_sub.plan_id,
      is_lifetime = v_sub.is_lifetime,
      is_trial = false,
      active_until = case when v_sub.is_lifetime then null else v_sub.current_period_end end,
      published_at = coalesce(i1.published_at, now()),
      updated_at = now()
  where i1.id = p_invitation_id
    and i1.user_id = auth.uid();

  return query
  select i2.slug, i2.status, i2.active_until, i2.is_lifetime
  from public.invitations as i2
  where i2.id = p_invitation_id
    and i2.user_id = auth.uid()
  limit 1;
end;
$$;

-- -------------------------------------------------------------
-- B. V11 account entitlement: JSONB scalar, no output-column names.
-- -------------------------------------------------------------
create or replace function public.get_my_entitlement_v11()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'subscription_id', s.id,
    'user_id', s.user_id,
    'plan_id', s.plan_id,
    'plan_slug', p.slug,
    'plan_name_ar', p.name_ar,
    'plan_name_en', p.name_en,
    'plan_features', coalesce(p.features, '[]'::jsonb),
    'started_at', s.started_at,
    'current_period_end', s.current_period_end,
    'is_lifetime', s.is_lifetime,
    'subscription_status', s.status
  )
  from public.subscriptions as s
  join public.plans as p on p.id = s.plan_id
  where s.user_id = auth.uid()
    and s.status = 'active'::public.subscription_status
    and (
      s.is_lifetime = true
      or (s.current_period_end is not null and s.current_period_end > now())
    )
  order by s.is_lifetime desc,
           s.updated_at desc nulls last,
           s.started_at desc
  limit 1;
$$;

-- -------------------------------------------------------------
-- C. V11 draft save RPC.
-- The browser no longer needs PATCH ... .single()/object coercion.
-- Existing live/trial/payment activation fields are intentionally
-- preserved when a customer edits invitation content.
-- -------------------------------------------------------------
create or replace function public.save_invitation_v11(
  p_invitation_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.invitations%rowtype;
  v_event_date timestamptz;
  v_language text;
begin
  if v_uid is null then
    raise exception 'login required';
  end if;

  if p_payload is null then
    raise exception 'payload required';
  end if;

  begin
    v_event_date := nullif(p_payload->>'event_date','')::timestamptz;
  exception when others then
    raise exception 'invalid event_date';
  end;

  if v_event_date is null then
    raise exception 'event_date required';
  end if;

  v_language := case
    when p_payload->>'language' in ('ar','en') then p_payload->>'language'
    else 'ar'
  end;

  if p_invitation_id is not null then
    update public.invitations as i
    set template_slug = coalesce(nullif(p_payload->>'template_slug',''), i.template_slug),
        slug = coalesce(nullif(p_payload->>'slug',''), i.slug),
        language = v_language,
        partner1_name = coalesce(p_payload->>'partner1_name',''),
        partner2_name = coalesce(p_payload->>'partner2_name',''),
        event_date = v_event_date,
        venue_name = nullif(p_payload->>'venue_name',''),
        city = nullif(p_payload->>'city',''),
        map_url = nullif(p_payload->>'map_url',''),
        message = coalesce(p_payload->>'message',''),
        hero_image_url = nullif(p_payload->>'hero_image_url',''),
        gallery_urls = case
          when jsonb_typeof(p_payload->'gallery_urls')='array' then p_payload->'gallery_urls'
          else '[]'::jsonb
        end,
        song_url = nullif(p_payload->>'song_url',''),
        theme_config = case
          when jsonb_typeof(p_payload->'theme_config')='object' then p_payload->'theme_config'
          else '{}'::jsonb
        end,
        features_config = case
          when jsonb_typeof(p_payload->'features_config')='object' then p_payload->'features_config'
          else '{}'::jsonb
        end,
        updated_at = now()
    where i.id = p_invitation_id
      and i.user_id = v_uid
    returning i.* into v_row;

    if found then
      return to_jsonb(v_row);
    end if;
  end if;

  insert into public.invitations(
    user_id, template_slug, slug, status, language,
    partner1_name, partner2_name, event_date,
    venue_name, city, map_url, message,
    hero_image_url, gallery_urls, song_url,
    theme_config, features_config
  )
  values(
    v_uid,
    coalesce(nullif(p_payload->>'template_slug',''),'classic-ivory'),
    coalesce(nullif(p_payload->>'slug',''),'invite-'||substr(gen_random_uuid()::text,1,6)),
    'draft'::public.invitation_status,
    v_language,
    coalesce(p_payload->>'partner1_name',''),
    coalesce(p_payload->>'partner2_name',''),
    v_event_date,
    nullif(p_payload->>'venue_name',''),
    nullif(p_payload->>'city',''),
    nullif(p_payload->>'map_url',''),
    coalesce(p_payload->>'message',''),
    nullif(p_payload->>'hero_image_url',''),
    case when jsonb_typeof(p_payload->'gallery_urls')='array' then p_payload->'gallery_urls' else '[]'::jsonb end,
    nullif(p_payload->>'song_url',''),
    case when jsonb_typeof(p_payload->'theme_config')='object' then p_payload->'theme_config' else '{}'::jsonb end,
    case when jsonb_typeof(p_payload->'features_config')='object' then p_payload->'features_config' else '{}'::jsonb end
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- -------------------------------------------------------------
-- D. V11 publish RPC: JSONB return + fully qualified columns.
-- -------------------------------------------------------------
create or replace function public.publish_invitation_v11(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_row public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  select s.*
  into v_sub
  from public.subscriptions as s
  where s.user_id = auth.uid()
    and s.status = 'active'::public.subscription_status
    and (
      s.is_lifetime = true
      or (s.current_period_end is not null and s.current_period_end > now())
    )
  order by s.is_lifetime desc,
           s.updated_at desc nulls last,
           s.started_at desc
  limit 1;

  if not found then
    raise exception 'active account subscription required';
  end if;

  update public.invitations as i
  set status = 'active'::public.invitation_status,
      plan_id = v_sub.plan_id,
      is_lifetime = v_sub.is_lifetime,
      is_trial = false,
      active_until = case when v_sub.is_lifetime then null else v_sub.current_period_end end,
      published_at = coalesce(i.published_at, now()),
      updated_at = now()
  where i.id = p_invitation_id
    and i.user_id = auth.uid()
  returning i.* into v_row;

  if not found then
    raise exception 'invitation not found for current account';
  end if;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.get_my_entitlement_v11() to authenticated;
grant execute on function public.save_invitation_v11(uuid,jsonb) to authenticated;
grant execute on function public.publish_invitation_v11(uuid) to authenticated;
grant execute on function public.publish_invitation_v10(uuid) to authenticated;

commit;

-- =============================================================
-- VERIFY
-- 1 row = your active membership. v11_* columns should all be true.
-- =============================================================
select
  p.email,
  pl.name_ar as plan,
  s.status,
  s.is_lifetime,
  s.current_period_end,
  to_regprocedure('public.save_invitation_v11(uuid,jsonb)') is not null as v11_save_ready,
  to_regprocedure('public.publish_invitation_v11(uuid)') is not null as v11_publish_ready,
  to_regprocedure('public.get_my_entitlement_v11()') is not null as v11_entitlement_ready
from public.subscriptions as s
join public.profiles as p on p.id=s.user_id
join public.plans as pl on pl.id=s.plan_id
where s.status='active'::public.subscription_status
order by s.updated_at desc nulls last;
