@AGENTS.md

# Bayline

Tap-to-join wallet rewards cards plus retention insights for any local business with repeat customers
(cafés, barbershops, golf sims, gyms…). Live at https://getbayline.app
(Vercel; the apex is primary and www redirects). Setup steps for every service are in `docs/SETUP.md`.

## Working here

- The folder path contains ":" and "&", which breaks npm's bin lookup, so scripts call node directly
  (`node node_modules/next/dist/bin/next …`, `node node_modules/typescript/bin/tsc --noEmit -p .`).
- iCloud sync creates "… 2.ts" duplicates; delete them (tsconfig ignores them). If type checking fails on
  route types, delete `.next/types` (the real ones are in `.next/dev/types`).
- Next.js 16 with `cacheComponents`: read cookies inside Suspense, call `connection()` before using
  the current time, middleware is `proxy.ts`, post-response work uses `after()`.
- Secrets: only in `.env.local` (gitignored) and Vercel env vars marked Sensitive. Apple/Google
  credentials live in `~/bayline-secrets`; never print, commit or ask for them in chat.
  `/api/health` reports credential status without values.
- Commit after each step; end messages with the Co-Authored-By line.

## Commands

- `npm run test:unit`: pure logic (strip wording, offers, slow hours), via `tests/unit/register.mjs`
- `npm run test:db`: migrations and RLS in PGlite, no network
- `npm run test:security`: against the live Supabase project
- `npm run db:migrate`: applies new files in `supabase/migrations` to Supabase
- `node --import ./tests/unit/register.mjs scripts/render-card-previews.mjs <dir>`: PNGs of the card front

## Data model notes

- RLS everywhere; helpers in the `private` schema. New projects don't auto-grant, so migrations grant
  tables and columns explicitly (owners can't read customer tokens).
- Progress comes from `private.customer_progress`: a card cycle runs from the last *main* reward
  (`rewards_redeemed.kind`) or `customers.card_reset_at`, and counts visits with `visits.stamp`.
  Head-start stamps are `customers.bonus_stamps`, counted on the very first card only and never as
  visits. The optional milestone (`venues.milestone_text/at`) is redeemable once per cycle with
  `redeem_reward(customer, 'milestone')`.
- Stamp rules (all through `private.give_stamp`): one per day (`venues.stamps_per_day`, null on the
  demo venue); a full card earns nothing more (a tap returns `reward_ready` and records the day's
  visit with `stamp = false`); redeeming starts the card at 0 and records that day's visit without a
  stamp. Staff use `stamp_customer`, `remove_stamp`, `reset_card`, `card_status`, `find_card`.
- `card_events` logs every join, stamp, redemption and manual change, written only by triggers,
  with `actor`/`actor_email` from `auth.uid()` (null source = the customer's own tap).
- The pass QR holds `customers.card_code` (16 random hex characters), which `/dashboard/scan` looks
  up; the "Member 8247 1930" under it is only for people to read.
- Any change a pass shows must bump `customers.pass_updated_at` (triggers do this) and then call
  `notifyPassChanged` / `notifyVenuePassesChanged` to push to Apple and patch Google.

## Wallet cards (v3)

- Apple storeCard front: logo (drawn 30pt tall, centered in a 50pt canvas so it lines up with the
  logo text) + logo text, the member's first name top right, strip image, then REWARD and OFFER
  (OFFER only while an offer is active), and a QR of the 8-digit member number. Everything else is
  in Pass Details (`backSections` in `lib/wallet/pass-content.ts`).
- Card colors per venue: `card_bg`, `card_fg`, `card_accent` (stamps, points bar) and `card_reward`
  (reward stamps and markers, the offer/ready banner; null = same as the accent, which older venues
  have). New venues default to the Bayline palette: midnight, blue stamps, orange rewards.
- The strip (`lib/wallet/strip.ts`) is the design canvas: stamps (two rows above 6), a gift on the
  milestone stamp and on the last stamp (points: gift markers on the bar),
  and one line: progress, the offer banner, or "… ready! Show staff". Text is drawn as Inter outlines
  (`lib/wallet/strip-font.ts`, fonts in `lib/wallet/fonts`) because the server has no fonts. Google's
  hero image and the Card tab previews (`/api/wallet/image/preview`) use the same renderer.
- Notifications: iPhone announces a field only when its value *changes*, never when it first
  appears. Offer alerts ride on the back "offer" field, which is always present; REWARD carries
  a changeMessage only when it turns "ready". Expired offers drop off with no alert (daily cron
  `/api/cron/expire-offers`, needs `CRON_SECRET`).
- Google: class per venue, object per customer; offers also go out with `addMessage`, ending on the
  offer's end date. Real customers need Google publishing access (demo mode only allows test users).

## Dashboard

- Tabs: Scan · Home · Customers · Messages (owners). The gear menu holds Card, Stand, the demo-only
  "send to demo guests" link and Admin. `/dashboard/add-visit` redirects to Scan.
- Scan (`components/scan/`): camera via BarcodeDetector or jsQR, search fallback, big buttons; card
  actions in `app/dashboard/scan/actions.ts` (shared with the customer profile
  `/dashboard/customers/[id]`) push to wallets with `notifyPassChanged` in `after()`.
- Home: `venue_home` (last 7 days vs the 7 before; regulars/slipping via `private.label_counts`,
  which must match `customer_insights`), one Send offer with a preview (`SendOfferButton`), rewards
  ready, slipping regulars, Recent activity from `card_events` (refreshes every 30s), and the Monday
  brief at `/dashboard/brief` (`venue_week`).

## Brand and styling

- Dark everywhere (marketing site, dashboard, join pages). Palette tokens in `app/globals.css`:
  midnight (page), surface / surface-2 (cards, inputs), line (borders), fg (text), muted, blue (the
  brand: logo, links, icons, charts, stamps) and orange (accent only: the main CTA, the founding
  offer, reward moments). Blue and orange fills always take midnight text (light text fails AA).
- `button.primary` is the orange CTA, `button.accent` / `button.small` blue, `button.secondary` an
  outlined surface. `.hero-aurora` is the hero glow, `.glow-hover` the blue card hover.
- Printed pages (`/dashboard/qr`, `/dashboard/stand`) stay white with midnight ink.

## Marketing site

- Homepage `app/page.tsx`, five sections: hero, how it works, what you get, `#try-it` + `#founding`
  cards side by side, FAQ (4). Keep paragraphs to two lines on desktop. Card styles live on /demo, the
  extra FAQs on /support. Sample businesses are made up (Fairway Sim Club, Juniper Lane Coffee, Brass Comb
  Barbers), never real ones; shared `components/site/` header (nav: How it works · Venue login ·
  Demo), footer and `TrackLink`/`track`. `/support`, `/privacy`, `/terms` use `LegalPage`; privacy
  and terms are drafts pending legal review (`docs/LEGAL-REVIEW.md`).
- `/demo` (`app/demo/page.tsx`): QR / "Add the demo card" to `/t/bayline-demo?src=demo`, then
  `components/demo/DemoDashboard.tsx`, a clickable sample dashboard built from the real dashboard
  components (labeled "Sample data"; Send offer opens a simulated lock-screen phone). It has a
  `sampleOfferSlot` prop for the planned "Send me a sample offer" button.
- Pricing isn't shown: the site only has the founding offer (1 month free). The paid plan lives in
  `lib/pricing.ts` for when pricing goes public.
- First-load intro: `components/site/IntroLoader.tsx`, an inline script in the root layout that only
  runs on the marketing pages it lists (full once, logo-only for returning visitors, nothing again in
  the same session; `?intro=1` forces it). The overlay is a `<bayline-intro>` custom element so React
  skips it while hydrating `<body>`.
- Phone mockups use `components/landing/PhoneFrame.tsx` (real 9:19.5 proportions).
- Card images on the site are the approved renders in `public/marketing/cards/`, made with
  `scripts/render-card-previews.mjs`; re-render them after a card design change.
- Analytics: `site_events` table (server-only). Clicks and views via `POST /api/events`
  (`try_it_click`, `book_call_click`, `demo_view`, `demo_button_click`); server-side
  `demo_link_open` (the demo link opened from /demo's QR or button) and `demo_join` (joined from
  `?src=demo`; older `?src=site` joins are `demo_join_site`). Each row has the page path.
- No fake testimonials, logos, stats or customer counts. Sample product data is labeled as sample.
- Logo: `components/ui/Logo.tsx` shows `public/brand/logo-for-dark-bg.svg` (blue swirl, light
  wordmark) or, with `onLight`, the all-midnight `logo-for-light-bg.svg` (the official logo, viewBox
  trimmed, C2PA metadata removed). Favicon `app/icon1.svg` (blue on midnight; `icon2.png` 48px and
  `app/apple-icon.png` are rendered from it). Social image `app/opengraph-image.png` comes from
  `scripts/render-og-image.mjs` (run it with `--import ./tests/unit/register.mjs`). The full original brand set
  (symbols, PNG exports, app icon) was in `website/`; recover it with `git show d31cf6f:website/<file>`.
