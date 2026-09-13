# Elaash Beauty Ladies Salon website

Responsive Vite + React + TypeScript website for Elaash Beauty Ladies Salon, with English/Arabic layouts, single-page smooth section navigation, a searchable paginated services gallery and WhatsApp booking.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local address shown in the terminal.

## Production check

Run `npm run build`, then `npm run preview`.

## Current implementation

- Single continuous homepage with Home, Services & Prices, About, Gallery and Contact anchors.
- Premium horizontal service category tabs with keyboard arrow navigation.
- Paginated treatment card gallery with responsive page sizes.
- Search across all categories using the same card and pagination design.
- WhatsApp booking drawer using `+971 54 500 6642` with service, category, price, package, name, date, time and optional message.
- Category-specific image pools for card imagery with lazy-loaded images and fallback styling.
- Arabic RTL support for navigation, search, controls and booking text.

## Content note

Service names and prices come from `src/data/services.ts`. Confirm any placeholder imagery, social links and opening details with the salon owner before publishing.


## Admin panel

The first admin interface is available at `/admin` (also `?admin=1` or `#admin` as SPA fallbacks). It currently edits a local draft based on `src/data/services.ts`. Supabase database/storage wiring is intentionally the next step.

## Supabase connection
1. Copy `.env.example` to `.env`.
2. Paste your Supabase Project URL and public anon/publishable key.
3. Run `npm install` (the project now includes `@supabase/supabase-js`).
4. Restart `npm run dev`.
5. Create an admin user in Supabase Authentication > Users, then open `/admin` and sign in.

The public Services section reads active rows from Supabase when available and falls back to the bundled catalogue if Supabase is not configured or the table is still empty.

## Phase 2 — Offers & Packages

This version adds a database-backed Offers & Packages section immediately after Services & Prices.

Before using it, run `supabase/phase2_offers_packages.sql` once in Supabase SQL Editor. It creates:
- `package_offers`
- `package_offer_services`
- public `offer-images` Storage bucket
- RLS policies and grants

Admin now has an **Offers & Packages** tab. Create a package, select treatments, optionally set quantities, enter the new offer price, and save. The regular/old price is calculated automatically from the currently selected treatment prices. The public section reads only from Supabase; there is no hardcoded package fallback.

## Phase 4 — Customer accounts / My Elaash

Run `supabase/phase4_customer_accounts.sql` once after Phase 2. It adds customer profiles, appointments and assigned customer packages with RLS.

Public routes:
- `/login` — customer sign in, sign up and password reset
- `/account` — My Elaash customer portal

After running the migration, mark the existing salon admin Auth user as admin with the final SQL line shown in that migration. This is required because customer accounts now use the same Supabase Auth project and admin writes must not be available to normal customers.
