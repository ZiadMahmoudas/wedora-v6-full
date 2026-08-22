-- WEDORA: ensure authenticated admins can moderate guest content.
-- Safe to run more than once. Does not delete existing data.

grant select, update, delete on table public.guest_memories to authenticated;

drop policy if exists "memories admin delete" on public.guest_memories;
create policy "memories admin delete"
on public.guest_memories
for delete
to authenticated
using (public.is_admin());

-- Admin can see approved and pending guest content.
drop policy if exists "memories read" on public.guest_memories;
create policy "memories read"
on public.guest_memories
for select
using (
  approved
  or public.is_admin()
  or exists(
    select 1 from public.invitations i
    where i.id = invitation_id and i.user_id = auth.uid()
  )
);
