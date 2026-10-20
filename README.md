# Bayline (placeholder name)

Rewards + customer insights for indoor sports venues that sell time slots.

- `/`: one-page marketing site
- `/demo`: clickable demo for a fictional 4-bay golf venue, "Fairway Lounge" (sample data, no backend)
- `/v/[slug]`: customer QR check-in for a real venue (no login)
- `/login`: venue login by emailed magic link (invite only)
- `/dashboard`: owner dashboard, plus `/dashboard/messages`, `/rewards`, `/add-visit`, `/qr`
- `/admin`: platform admin: create venues, invite owners and staff

Setup (Supabase, email, Vercel): see [docs/SETUP.md](docs/SETUP.md).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

> The scripts call `node node_modules/next/dist/bin/next` directly because this folder's name contains `:`,
> which breaks npm's PATH lookup. On Vercel (or in a folder without `:`) that makes no difference.

## Database and tests

```bash
npm run db:migrate      # apply supabase/migrations/*.sql
npm run db:seed         # reset the Test Lounge (stamps) and Test Cages (points) venues
npm run make-admin -- you@example.com
npm run test:db         # schema + security rules in an in-memory Postgres (no Supabase needed)
npm run test:security   # venue A's owner can't reach venue B's data, against the real project
```

Security model: every table has Row Level Security. Owners and staff only reach their own venue;
platform admins reach all. Anonymous visitors can't read tables; the check-in page calls the
`get_checkin_venue` and `check_in` database functions. The secret key is only used server-side for
admin invites.

## Where things live

| Path | What it is |
| --- | --- |
| `lib/site.ts` | Brand name, email, phone, booking link. **Rename the product here.** |
| `lib/demo-data.ts` | Seeded fake data: 150 customers, ~6 months of bookings, one past campaign |
| `lib/analytics.ts` | Pure functions: stats, regulars, gone-quiet list, utilization heatmap |
| `lib/dashboard.ts` | Builds everything the owner dashboard needs from raw rows |
| `components/dashboard/*` | Owner dashboard sections (reusable with real data later) |
| `components/customer/*` | Phone check-in, stamp card, text opt-in, sample text offer |
| `components/landing/*` | Landing-page-only pieces |
| `supabase/migrations/*` | Tables, Row Level Security, check-in and dashboard functions |
| `lib/auth.ts`, `lib/data.ts` | Who's signed in, which venue, and dashboard reads |
| `lib/insights.ts` | Turns database rows into dashboard sections (shared components with the demo) |
| `app/v/[slug]`, `components/checkin/*` | Customer check-in |
| `app/dashboard/*`, `components/venue/*` | Owner dashboard pages |

## Deploy

1. Create an empty GitHub repo (no README), then from this folder:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On vercel.com: **Add New → Project → Import** the repo. Framework preset: Next.js. No settings or
   environment variables needed. Click **Deploy**.
3. Every push to `main` redeploys automatically.
