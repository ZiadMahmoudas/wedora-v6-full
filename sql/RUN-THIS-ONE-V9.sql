-- =============================================================
-- WEDORA V9 — ONE MEMBERSHIP / PUBLISH / SHARE FIX
-- Run this ONCE on the CURRENT project after the older WEDORA SQL files.
-- It is idempotent and repairs approved-payment accounts automatically.
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
