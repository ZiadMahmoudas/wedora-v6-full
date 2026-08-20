# WEDORA V6 — START HERE

## What this version includes
- Public Home, Templates, Template Preview, Examples, Pricing, Contact, Privacy, Terms, Refund pages.
- Complete Arabic / English switching.
- Customer sign-up/login and customer dashboard.
- Separate Admin login and protected Admin dashboard.
- Invitation builder with template, colors, photos, gallery, song and feature controls.
- One-time Silver / Golden plans per invitation.
- Annual and Lifetime duration support.
- Vodafone Cash / InstaPay manual payment + private receipt upload.
- Admin payment approval / rejection.
- Public invitation with countdown, song, RSVP, wishes, guest photos and audio guestbook.
- Couple/admin moderation for guest media.
- Dynamic plans and prices from Admin.
- Dynamic template management from Admin.
- Dynamic site settings from Admin.

## Setup in order
1. Create / open your Supabase project.
2. SQL Editor: run `sql/SETUP-FULL-V6.sql`.
3. SQL Editor: run `sql/MAKE-ADMIN.sql`.
4. Open `js/config.js` and set your Supabase Project URL and browser-safe publishable/anon key.
5. In Admin > Site Settings, replace the sample Vodafone Cash / InstaPay / contact values.
6. Serve the project through HTTP (Live Server, `npx serve .`, cPanel, etc.). Do not rely on double-click `file://` in production.
7. Admin portal: `admin-login.html`.
8. Customer portal: `auth.html`.

## Pricing / competitor undercut
Exact competitor plan card amounts were not hard-coded because the public crawl did not expose reliable current card prices. In Admin > Plans & Pricing:
- enter a verified `Reference price`
- keep `Undercut amount = 250` in Site Settings
- click `Reference − 250`
The public Home / Pricing / Checkout pages immediately use your database price.

## Important security
- Never put a service-role / secret Supabase key in browser JavaScript.
- Payment receipts are in a private bucket.
- Only an admin RPC can approve an order and activate an invitation.
- Customer and admin portals are separated by the profile role and database RLS.

## Recommended test
Create a new customer → build an invitation → choose Silver → transfer/test → upload receipt → open admin → approve → open the customer's invitation link → submit RSVP/photo/audio → approve guest media from dashboard/admin.
