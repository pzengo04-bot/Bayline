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
  (`rewards_redeemed.kind`). Head-start stamps are `customers.bonus_stamps`, counted in the first
  cycle only and never as visits. The optional milestone (`venues.milestone_text/at`) is redeemable
  once per cycle with `redeem_reward(customer, 'milestone')`.
- Any change a pass shows must bump `customers.pass_updated_at` (triggers do this) and then call
  `notifyPassChanged` / `notifyVenuePassesChanged` to push to Apple and patch Google.

## Wallet cards (v3)

- Apple storeCard front: logo (drawn 30pt tall, centered in a 50pt canvas so it lines up with the
  logo text) + logo text, the member's first name top right, strip image, then REWARD and OFFER
  (OFFER only while an offer is active), and a QR of the 8-digit member number. Everything else is
  in Pass Details (`backSections` in `lib/wallet/pass-content.ts`).
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

## Marketing site

- Homepage `app/page.tsx` (sections: hero, problem, how it works, owners, the card, `#try-it` teaser,
  `#founding` offer, FAQ, CTA); shared `components/site/` header (nav: How it works · Venue login ·
  Demo), footer and `TrackLink`/`track`. `/support`, `/privacy`, `/terms` use `LegalPage`; privacy
  and terms are drafts pending legal review (`docs/LEGAL-REVIEW.md`).
- `/demo` (`app/demo/page.tsx`): QR / "Add the demo card" to `/t/bayline-demo?src=demo`, then
  `components/demo/DemoDashboard.tsx`, a clickable sample dashboard built from the real dashboard
  components (labeled "Sample data"; Send offer opens a simulated lock-screen phone). It has a
  `sampleOfferSlot` prop for the planned "Send me a sample offer" button.
- Pricing isn't shown: the site only has the founding offer (60 days free). The paid plan lives in
  `lib/pricing.ts` for when pricing goes public.
- Phone mockups use `components/landing/PhoneFrame.tsx` (real 9:19.5 proportions).
- Card images on the site are the approved renders in `public/marketing/cards/`, made with
  `scripts/render-card-previews.mjs`; re-render them after a card design change.
- Analytics: `site_events` table (server-only). Clicks and views via `POST /api/events`
  (`try_it_click`, `book_call_click`, `demo_view`, `demo_button_click`); server-side
  `demo_link_open` (the demo link opened from /demo's QR or button) and `demo_join` (joined from
  `?src=demo`; older `?src=site` joins are `demo_join_site`). Each row has the page path.
- No fake testimonials, logos, stats or customer counts. Sample product data is labeled as sample.
- Logo: `components/ui/Logo.tsx` shows `public/brand/logo-for-{light,dark}-bg.svg` (the official
  logo with its viewBox trimmed to the drawn area and C2PA metadata removed). Favicon `app/icon1.svg`
  (+ `icon2.png` 48px) and `app/apple-icon.png` are the official files. The full original brand set
  (symbols, PNG exports, app icon) was in `website/`; recover it with `git show d31cf6f:website/<file>`.
