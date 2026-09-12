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
