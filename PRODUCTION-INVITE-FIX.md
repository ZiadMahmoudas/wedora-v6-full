# WEDORA — Production invitation + moderation fix

## Fixed
- `/w/:slug` now loads CSS and JavaScript from root (`/css/...`, `/js/...`) so Vercel rewrites do not break assets.
- Added `<base href="/">` and cache-busted invitation assets.
- Opening screen now clearly tells guests to tap the animated star and labels the action.
- Logged-in admins can open any invitation from **Admin → Invitations → Open & moderate**.
- When an admin opens an invitation, an Admin Mode bar appears and every wish/photo/audio item gets moderation controls.
- Admin can permanently delete abusive guest content directly from the invitation.
- Admin Memories page now links each memory back to its invitation.

## Deploy
Upload the contents of this folder to Vercel (or deploy the ZIP whose files are at the archive root).

## Supabase
If Delete returns a permission/RLS error, run:
`sql/ADMIN-GUEST-MODERATION.sql`

The SQL is safe to run more than once and does not delete guest data.
