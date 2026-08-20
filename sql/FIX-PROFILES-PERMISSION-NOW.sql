-- ============================================================
-- WEDORA V6.1 HOTFIX
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
