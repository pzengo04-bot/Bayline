# Bayline (placeholder name)

Rewards + customer insights for indoor sports venues that sell time slots.

- `/`: one-page marketing site
- `/demo`: clickable demo for a fictional 4-bay golf venue, "Fairway Lounge" (sample data, no backend)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

> The scripts call `node node_modules/next/dist/bin/next` directly because this folder's name contains `:`,
> which breaks npm's PATH lookup. On Vercel (or in a folder without `:`) that makes no difference.

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

To move to real data later, replace the arrays passed to `buildDashboard()` in `app/demo/page.tsx`
with database queries that return the same `Customer`, `Booking` and `Campaign` shapes.

## Deploy

1. Create an empty GitHub repo (no README), then from this folder:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On vercel.com: **Add New → Project → Import** the repo. Framework preset: Next.js. No settings or
   environment variables needed. Click **Deploy**.
3. Every push to `main` redeploys automatically.
