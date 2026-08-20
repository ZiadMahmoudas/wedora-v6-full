# WEDORA V6.1 — Fix `permission denied for table profiles`

Your Supabase Auth account is already created and email-confirmed. Do **not** create it again.

## Do this now

1. Supabase → **SQL Editor** → **New query**.
2. Copy/run the entire file:
   `sql/FIX-PROFILES-PERMISSION-NOW.sql`
3. The final SELECT should show your account and a `role` value (`user` or `admin`).
4. In the browser, sign out and sign in again.
5. Customer login uses `auth.html`; admin login uses `admin-login.html`.

## Why it happened

RLS policies existed, but the browser `authenticated` Postgres role was missing the base `SELECT` privilege on `public.profiles`. PostgreSQL checks table privileges before RLS can filter rows, so Supabase returned:

`permission denied for table profiles`

V6.1 adds the missing GRANTs and also makes normal profile lookup go through `get_my_profile()`, which returns only the currently authenticated user's own profile.

## If this is a customer account

The verification query should show:

`email | user`

## If this is your admin account

Run `sql/MAKE-ADMIN.sql` after the hotfix, then verify:

`admin@gmail.com | admin`
