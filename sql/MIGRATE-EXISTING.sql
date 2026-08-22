-- =============================================================
-- WEDORA CLEAN RELEASE — EXISTING DATABASE MIGRATION
-- For an existing WEDORA/Supabase project. Run this file once.
-- Idempotent normalization for profile permissions, guest wall, templates,
-- account membership and the publish/share flow.
-- =============================================================

-- ================= 01 PROFILE / PERMISSIONS =================

-- ============================================================
-- PROFILE / PERMISSIONS NORMALIZATION
-- Fixes: "permission denied for table profiles"
-- Safe to run on the existing project. No user recreation needed.
-- ============================================================

begin;

-- 1) Schema access is required before table privileges/RLS can work.
grant usage on schema public to anon, authenticated;

-- 2) Backfill profiles for users created before the trigger existed.
insert into public.profiles(id,email,full_name,phone)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data->>'full_name',''),
  nullif(u.raw_user_meta_data->>'phone','')
from auth.users u
on conflict(id) do update set
  email = excluded.email,
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  phone = coalesce(public.profiles.phone, excluded.phone),
  updated_at = now();

-- 3) Clean old profile policies from previous WEDORA versions.
drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;

alter table public.profiles enable row level security;

-- Customer can read only their own row; admin can read all rows.
create policy "profiles read"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

-- IMPORTANT: RLS is not a substitute for SQL privileges.
grant select on table public.profiles to authenticated;

-- 4) Safe RPC for the currently logged-in account.
-- This removes the frontend's dependency on directly querying profiles.
create or replace function public.get_my_profile()
returns table(
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  preferred_language text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.role,
    p.preferred_language,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_profile() to authenticated;

-- 5) Explicit grants for every browser-accessed table.
-- RLS still decides which rows are actually visible/changeable.

grant select on table public.templates to anon, authenticated;
grant insert, update on table public.templates to authenticated;

grant select on table public.plans to anon, authenticated;
grant insert, update on table public.plans to authenticated;

grant select on table public.site_settings to anon, authenticated;
grant insert, update on table public.site_settings to authenticated;

grant select on table public.invitations to anon, authenticated;
grant insert, update on table public.invitations to authenticated;

grant select, insert on table public.orders to authenticated;

grant insert on table public.rsvps to anon, authenticated;
grant select on table public.rsvps to authenticated;

grant select, insert on table public.guest_memories to anon, authenticated;
grant update, delete on table public.guest_memories to authenticated;

grant insert on table public.contact_messages to anon, authenticated;
grant select on table public.contact_messages to authenticated;

-- Keep RPC permissions explicit.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.invitation_is_public(uuid) to anon, authenticated;
grant execute on function public.approve_order(uuid) to authenticated;
grant execute on function public.reject_order(uuid,text) to authenticated;
grant execute on function public.start_trial(uuid) to authenticated;

commit;

-- ============================================================
-- VERIFY AFTER RUNNING
-- You should see your confirmed account here with role=user/admin.
-- ============================================================
select
  p.id,
  p.email,
  p.full_name,
  p.role,
  u.email_confirmed_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at desc;




-- ================= 02 GUEST WALL / SLUG =================

-- =========================================================
-- DUPLICATE SLUG + ANONYMOUS GUEST WALL
-- Safe to run as part of the clean setup.
-- =========================================================

-- 1) Never crash when a requested invitation link already exists.
--    ahmed-salma -> ahmed-salma-2 -> ahmed-salma-3 ...
create or replace function public.ensure_unique_invitation_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  candidate text;
  suffix_no integer := 1;
begin
  base_slug := lower(trim(coalesce(new.slug,'')));
  base_slug := regexp_replace(base_slug, '[[:space:]_]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  if base_slug = '' then
    base_slug := 'invite-' || substr(gen_random_uuid()::text,1,6);
  end if;

  -- Serialize attempts for the same base slug to avoid normal race conditions.
  perform pg_advisory_xact_lock(hashtext(base_slug));

  candidate := base_slug;
  while exists(
    select 1
    from public.invitations i
    where i.slug = candidate
      and (new.id is null or i.id <> new.id)
  ) loop
    suffix_no := suffix_no + 1;
    candidate := base_slug || '-' || suffix_no::text;
  end loop;

  new.slug := candidate;
  return new;
end $$;

drop trigger if exists ensure_unique_invitation_slug_trigger on public.invitations;
create trigger ensure_unique_invitation_slug_trigger
before insert or update of slug on public.invitations
for each row execute function public.ensure_unique_invitation_slug();

-- 2) Explicit anonymous guest access. No customer account is required.
grant insert on table public.rsvps to anon, authenticated;
grant select, insert on table public.guest_memories to anon, authenticated;

-- Wishes are public immediately. Photos/audio stay pending moderation.
drop policy if exists "memories public insert" on public.guest_memories;
create policy "memories public insert"
on public.guest_memories
for insert
with check(
  public.invitation_is_public(invitation_id)
  and char_length(coalesce(guest_name,'')) <= 80
  and (
    (
      type='wish'
      and approved=true
      and media_url is null
      and char_length(trim(coalesce(message,''))) between 1 and 280
    )
    or
    (
      type in ('photo','audio')
      and approved=false
      and media_url is not null
    )
  )
);

-- Public may only read approved memories.
drop policy if exists "memories read" on public.guest_memories;
create policy "memories read"
on public.guest_memories
for select
using(
  approved
  or public.is_admin()
  or exists(
    select 1 from public.invitations i
    where i.id=invitation_id and i.user_id=auth.uid()
  )
);

-- 3) Enable realtime INSERT notifications for the guest wall when possible.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(
       select 1 from pg_publication_tables
       where pubname='supabase_realtime'
         and schemaname='public'
         and tablename='guest_memories'
     ) then
    alter publication supabase_realtime add table public.guest_memories;
  end if;
end $$;

-- 4) Helpful verification output.
select 'Guest wall ready' as status,
       (select count(*) from public.invitations) as invitations,
       (select count(*) from public.guest_memories) as guest_memories;




-- ================= 03 PREMIUM TEMPLATES =================

-- WEDORA — PREMIUM TEMPLATE DATA
-- Idempotent template seed/update.

insert into public.templates(
  slug,name_ar,name_en,category,preview_image_url,accent,background,is_active,sort_order
) values
('classic-ivory','أتلييه عاجي','Ivory Atelier','wedding','assets/templates/classic-ivory.jpg','#9c7751','#f4eee5',true,10),
('editorial-noir','بوردو إديتوريال','Bordeaux Editorial','wedding','assets/templates/editorial-noir.jpg','#7d203f','#f2eee7',true,20),
('botanical-sage','سيج بوتانيكا','Sage Botanica','engagement','assets/templates/botanical-sage.jpg','#7b653e','#e9eddf',true,30),
('moonlight-navy','كوكبات منتصف الليل','Midnight Constellation','katb-ketab','assets/templates/moonlight-navy.jpg','#c7c1ae','#0c1727',true,40),
('royal-arabesque','أرابيسك ملكي','Royal Arabesque','wedding','assets/templates/royal-arabesque.jpg','#d0a255','#500716',true,50),
('minimal-blush','بيرل بلَش','Pearl Blush','engagement','assets/templates/minimal-blush.jpg','#a56b77','#f3e5e2',true,60),
('desert-pearl','لؤلؤة الصحراء','Desert Pearl','wedding','assets/templates/desert-pearl.jpg','#9c7b4f','#e9ddca',true,70),
('emerald-majlis','مجلس زمردي','Emerald Majlis','katb-ketab','assets/templates/emerald-majlis.jpg','#c4a569','#0c352f',true,80)
on conflict(slug) do update set
  name_ar=excluded.name_ar,
  name_en=excluded.name_en,
  category=excluded.category,
  preview_image_url=excluded.preview_image_url,
  accent=excluded.accent,
  background=excluded.background,
  is_active=excluded.is_active,
  sort_order=excluded.sort_order;

select slug,name_ar,name_en,is_active,sort_order
from public.templates
order by sort_order,slug;




-- ================= 04 MEMBERSHIP / PUBLISH / SHARE =================

-- =============================================================
-- WEDORA — CURRENT MEMBERSHIP / PUBLISH / SHARE MODEL
-- Replaces the old per-invitation payment/subscription patchwork.
-- Approved-payment accounts are repaired automatically.
-- =============================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type public.subscription_status as enum ('active','expired','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  is_lifetime boolean not null default false,
  source_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions add column if not exists plan_id uuid;
alter table public.subscriptions add column if not exists status public.subscription_status not null default 'active';
alter table public.subscriptions add column if not exists started_at timestamptz not null default now();
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists is_lifetime boolean not null default false;
alter table public.subscriptions add column if not exists source_order_id uuid;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

-- Rebuild one account entitlement from ALL approved orders in chronological order.
-- This means an account that already paid/was approved is repaired automatically.
create or replace function public.rebuild_subscription_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  existing public.subscriptions%rowtype;
  v_found boolean := false;
  v_plan_id uuid;
  v_source_order uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_lifetime boolean := false;
  v_status public.subscription_status;
begin
  if p_user_id is null then return; end if;

  select * into existing from public.subscriptions where user_id=p_user_id;
  if existing.id is not null
     and existing.status='active'
     and existing.is_lifetime=true then
    return;
  end if;

  for r in
    select o.id,o.plan_id,coalesce(o.reviewed_at,o.created_at,now()) as paid_at,
           p.duration_months,p.is_lifetime
    from public.orders o
    join public.plans p on p.id=o.plan_id
    where o.user_id=p_user_id and o.status='approved'
    order by coalesce(o.reviewed_at,o.created_at,now()),o.created_at,o.id
  loop
    v_found := true;
    v_plan_id := r.plan_id;
    v_source_order := r.id;

    if v_start is null then v_start := r.paid_at; end if;

    if r.is_lifetime then
      v_lifetime := true;
      v_end := null;
    elsif not v_lifetime then
      if v_end is null or v_end < r.paid_at then
        v_end := r.paid_at + make_interval(months=>coalesce(r.duration_months,12));
      else
        v_end := v_end + make_interval(months=>coalesce(r.duration_months,12));
      end if;
    end if;
  end loop;

  if not v_found then return; end if;

  v_status := case
    when v_lifetime then 'active'::public.subscription_status
    when v_end is not null and v_end>now() then 'active'::public.subscription_status
    else 'expired'::public.subscription_status
  end;

  insert into public.subscriptions(
    user_id,plan_id,status,started_at,current_period_end,is_lifetime,source_order_id,updated_at
  ) values(
    p_user_id,v_plan_id,v_status,coalesce(v_start,now()),v_end,v_lifetime,v_source_order,now()
  )
  on conflict(user_id) do update set
    plan_id=excluded.plan_id,
    status=excluded.status,
    started_at=excluded.started_at,
    current_period_end=excluded.current_period_end,
    is_lifetime=excluded.is_lifetime,
    source_order_id=excluded.source_order_id,
    updated_at=now();
end $$;

-- Repair every customer that already has an approved order.
do $$
declare u record;
begin
  for u in select distinct user_id from public.orders where status='approved'
  loop
    perform public.rebuild_subscription_for_user(u.user_id);
  end loop;
end $$;

-- Compatibility: if an older WEDORA build created subscription_orders,
-- repair accounts from the latest approved legacy order when no account entitlement exists.
do $$
declare
  u record;
  r record;
  v_end timestamptz;
begin
  if to_regclass('public.subscription_orders') is null then return; end if;

  for u in execute 'select distinct user_id from public.subscription_orders where status=''approved'''
  loop
    if exists(select 1 from public.subscriptions s where s.user_id=u.user_id) then
      continue;
    end if;

    execute '
      select so.id,so.user_id,so.plan_id,coalesce(so.reviewed_at,so.created_at,now()) paid_at,
             p.duration_months,p.is_lifetime
      from public.subscription_orders so
      join public.plans p on p.id=so.plan_id
      where so.user_id=$1 and so.status=''approved''
      order by coalesce(so.reviewed_at,so.created_at,now()) desc
      limit 1'
    into r using u.user_id;

    if r.plan_id is not null then
      v_end := case when r.is_lifetime then null else r.paid_at+make_interval(months=>coalesce(r.duration_months,12)) end;
      insert into public.subscriptions(user_id,plan_id,status,started_at,current_period_end,is_lifetime,source_order_id)
      values(
        r.user_id,r.plan_id,
        case when r.is_lifetime or v_end>now() then 'active'::public.subscription_status else 'expired'::public.subscription_status end,
        r.paid_at,v_end,r.is_lifetime,null
      ) on conflict(user_id) do nothing;
    end if;
  end loop;
end $$;

-- One reliable endpoint for the frontend.
-- It repairs an approved-payment account before returning the entitlement.
create or replace function public.get_my_entitlement_v9()
returns table(
  subscription_id uuid,
  user_id uuid,
  plan_id uuid,
  plan_slug text,
  plan_name_ar text,
  plan_name_en text,
  plan_features jsonb,
  started_at timestamptz,
  current_period_end timestamptz,
  is_lifetime boolean,
  subscription_status public.subscription_status
)
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then return; end if;
  perform public.rebuild_subscription_for_user(auth.uid());

  return query
  select s.id,s.user_id,s.plan_id,p.slug,p.name_ar,p.name_en,p.features,
         s.started_at,s.current_period_end,s.is_lifetime,s.status
  from public.subscriptions s
  join public.plans p on p.id=s.plan_id
  where s.user_id=auth.uid()
    and s.status='active'
    and (s.is_lifetime or (s.current_period_end is not null and s.current_period_end>now()))
  limit 1;
end $$;

-- Publish using ACCOUNT entitlement, never requiring another payment for each invitation.
create or replace function public.publish_invitation_v9(p_invitation_id uuid)
returns table(slug text,status public.invitation_status,active_until timestamptz,is_lifetime boolean)
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.subscriptions%rowtype;
  i public.invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select * into i from public.invitations
  where id=p_invitation_id and user_id=auth.uid()
  for update;
  if not found then raise exception 'invitation not found'; end if;

  perform public.rebuild_subscription_for_user(auth.uid());

  select * into s from public.subscriptions
  where user_id=auth.uid()
    and status='active'
    and (is_lifetime or (current_period_end is not null and current_period_end>now()))
  limit 1;

  if not found then raise exception 'active account subscription required'; end if;

  update public.invitations
  set status='active',
      plan_id=s.plan_id,
      is_lifetime=s.is_lifetime,
      is_trial=false,
      active_until=case when s.is_lifetime then null else s.current_period_end end,
      published_at=coalesce(published_at,now()),
      updated_at=now()
  where id=p_invitation_id;

  return query
  select x.slug,x.status,x.active_until,x.is_lifetime
  from public.invitations x where x.id=p_invitation_id;
end $$;

-- Admin approval now activates the ACCOUNT only.
-- The customer decides when the finished invitation is published.
create or replace function public.approve_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  o public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select * into o from public.orders
  where id=p_order_id and status='pending_review'
  for update;
  if not found then raise exception 'order not found or already reviewed'; end if;

  update public.orders
  set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),admin_notes=null
  where id=p_order_id;

  perform public.rebuild_subscription_for_user(o.user_id);
end $$;

create or replace function public.reject_order(p_order_id uuid,p_note text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.orders
  set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),
      admin_notes=coalesce(nullif(trim(p_note),''),'Payment could not be verified')
  where id=p_order_id and status='pending_review';
  if not found then raise exception 'order not found or already reviewed'; end if;
end $$;

alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions own read" on public.subscriptions;
create policy "subscriptions own read" on public.subscriptions for select
using(user_id=auth.uid() or public.is_admin());

grant usage on schema public to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.profiles,public.plans,public.invitations,public.orders to authenticated;
grant execute on function public.get_my_entitlement_v9() to authenticated;
grant execute on function public.publish_invitation_v9(uuid) to authenticated;
grant execute on function public.approve_order(uuid) to authenticated;
grant execute on function public.reject_order(uuid,text) to authenticated;
revoke all on function public.rebuild_subscription_for_user(uuid) from public,anon,authenticated;

-- Sanity check: after running this, approved customers should appear here.
select p.email,p.full_name,pl.name_ar as plan,s.status,s.is_lifetime,s.current_period_end
from public.subscriptions s
join public.profiles p on p.id=s.user_id
join public.plans pl on pl.id=s.plan_id
order by s.updated_at desc;




-- =============================================================
-- V10 PUBLISH HOTFIX — coercion-safe account publishing
-- =============================================================
grant usage on schema public to authenticated;
grant select on public.subscriptions, public.plans, public.invitations to authenticated;

-- Read the current active account plan without depending on legacy repair logic.
create or replace function public.get_my_entitlement_v10()
returns table(
  subscription_id uuid,
  user_id uuid,
  plan_id uuid,
  plan_slug text,
  plan_name_ar text,
  plan_name_en text,
  plan_features jsonb,
  started_at timestamptz,
  current_period_end timestamptz,
  is_lifetime boolean,
  subscription_status public.subscription_status
)
language sql
stable
security definer
set search_path=public
as $$
  select
    s.id,
    s.user_id,
    s.plan_id,
    p.slug,
    p.name_ar,
    p.name_en,
    coalesce(p.features,'[]'::jsonb),
    s.started_at,
    s.current_period_end,
    s.is_lifetime,
    s.status
  from public.subscriptions s
  join public.plans p on p.id=s.plan_id
  where s.user_id=auth.uid()
    and s.status='active'
    and (s.is_lifetime or (s.current_period_end is not null and s.current_period_end>now()))
  order by s.is_lifetime desc, s.updated_at desc nulls last, s.started_at desc
  limit 1
$$;

-- Publish against the already-active ACCOUNT subscription.
-- No extra payment and no per-invitation subscription is required.
create or replace function public.publish_invitation_v10(p_invitation_id uuid)
returns table(slug text,status public.invitation_status,active_until timestamptz,is_lifetime boolean)
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.subscriptions%rowtype;
  i public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;

  select * into i
  from public.invitations
  where id=p_invitation_id and user_id=auth.uid()
  for update;

  if not found then
    raise exception 'invitation not found for current account';
  end if;

  select * into s
  from public.subscriptions
  where user_id=auth.uid()
    and status='active'
    and (is_lifetime or (current_period_end is not null and current_period_end>now()))
  order by is_lifetime desc, updated_at desc nulls last, started_at desc
  limit 1;

  if not found then
    raise exception 'active account subscription required';
  end if;

  update public.invitations
  set status='active',
      plan_id=s.plan_id,
      is_lifetime=s.is_lifetime,
      is_trial=false,
      active_until=case when s.is_lifetime then null else s.current_period_end end,
      published_at=coalesce(published_at,now()),
      updated_at=now()
  where id=p_invitation_id and user_id=auth.uid();

  return query
  select x.slug,x.status,x.active_until,x.is_lifetime
  from public.invitations x
  where x.id=p_invitation_id;
end $$;

grant execute on function public.get_my_entitlement_v10() to authenticated;
grant execute on function public.publish_invitation_v10(uuid) to authenticated;


-- ================= FINAL 2026-08-22 SAVE/PUBLISH V11 =================
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
