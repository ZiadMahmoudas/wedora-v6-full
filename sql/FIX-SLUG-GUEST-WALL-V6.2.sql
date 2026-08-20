-- =========================================================
-- WEDORA V6.2 — duplicate slug + anonymous guest wall fix
-- Run AFTER V6 / V6.1 setup.
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
select 'V6.2 ready' as status,
       (select count(*) from public.invitations) as invitations,
       (select count(*) from public.guest_memories) as guest_memories;
