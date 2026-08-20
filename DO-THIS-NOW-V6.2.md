# WEDORA V6.2 — do this now

You do **not** need to recreate users or invitations.

## 1. Supabase SQL Editor
Run only:

`sql/FIX-SLUG-GUEST-WALL-V6.2.sql`

This fixes the duplicate invitation-link error and guarantees public guest submissions.

## 2. Replace the website files with V6.2
Keep your real Supabase URL/key in `js/config.js`.

## What changed
- Duplicate invitation slugs are automatically renamed (`name`, `name-2`, `name-3`).
- Old local drafts no longer overwrite a fresh template launch.
- Opening an invitation starts a calm automatic scroll.
- Any manual touch/wheel/key interaction stops auto-scroll immediately.
- Guest Wall accepts text without login.
- Guest name is optional.
- Written wishes appear immediately and update live/polling fallback.
- Written wishes max length: 280 characters.
- Audio guest messages max out automatically at 20 seconds.
- Photo/audio uploads still require admin moderation before becoming public.
- User-generated text is escaped before rendering to prevent script injection.
