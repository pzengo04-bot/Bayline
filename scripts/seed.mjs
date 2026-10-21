// Creates (or resets) the test venues with fake customers and realistic visit times:
//   Test Lounge   (/v/test-lounge)   golf sims, visit stamps, ~50 customers
//   Test Cages    (/v/test-cages)    batting cages, points, ~25 customers
//   Bayline Demo  (/v/bayline-demo)  for pitches: branded card, ~60 fake customers, unlimited taps per day.
//                                    Real people who joined the demo ("demo guests") are kept.
// Usage: npm run db:seed   (safe to re-run; only touches these venues)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import sharp from "sharp";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Missing SUPABASE_DB_URL in .env.local (see docs/SETUP.md, step 2).");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });

// Local times are passed as text and converted with timezone(): handing postgres.js a date-like
// string straight into "::timestamp at time zone" shifted every visit by the UTC offset.

// Seeded random numbers so every run produces the same data.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FIRST = ["James", "Olivia", "Daniel", "Sophia", "Chris", "Emma", "Ryan", "Ava", "Kevin", "Mia", "Jason", "Grace",
  "Tyler", "Chloe", "Matt", "Lily", "Eric", "Zoe", "Steve", "Hannah", "Josh", "Natalie", "Andrew", "Rachel", "Derek",
  "Megan", "Tony", "Lauren", "Marcus", "Priya", "Luis", "Aisha", "Ben", "Kim", "Sam", "Nina", "Greg", "Tess", "Omar", "Jenna"];
const LAST = ["Carter", "Nguyen", "Patel", "Brooks", "Garcia", "Kim", "Murphy", "Rossi", "Bennett", "Chen", "Hughes",
  "Lopez", "Foster", "Shah", "Price", "Ward", "Okafor", "Bell", "Diaz", "Russo", "Kelly", "Park", "Sullivan", "Reed"];

// How likely a visit starts at each hour (index = hour of day), weekday vs weekend.
const WEEKDAY = { 10: 1, 11: 1, 12: 3, 13: 2, 14: 1, 15: 1, 16: 2, 17: 6, 18: 10, 19: 10, 20: 8, 21: 5, 22: 2 };
const WEEKEND = { 10: 5, 11: 7, 12: 8, 13: 8, 14: 8, 15: 8, 16: 7, 17: 7, 18: 8, 19: 8, 20: 6, 21: 4, 22: 2 };

function pickHour(weekend) {
  const table = weekend ? WEEKEND : WEEKDAY;
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [h, w] of Object.entries(table)) {
    r -= w;
    if (r <= 0) return Number(h);
  }
  return 19;
}

const today = new Date();
const ymdIn = (date, timeZone) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date); // YYYY-MM-DD
/** Venue-local wall-clock time `daysAgo` (≥ 1) days back, at a realistic hour, as "YYYY-MM-DD HH:MM". */
function localVisitTime(daysAgo, timeZone = "America/New_York") {
  const ymd = ymdIn(new Date(today.getTime() - Math.max(1, daysAgo) * 86_400_000), timeZone);
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6 || (dow === 5 && rand() < 0.5);
  const hour = pickHour(weekend);
  return `${ymd} ${String(hour).padStart(2, "0")}:${pick(["00", "05", "15", "30", "45", "50"])}`;
}

/** Days-ago offsets for one customer's visits, newest last. */
function visitPattern(kind) {
  const days = [];
  if (kind === "regular") {
    const cadence = randInt(4, 9);
    for (let d = randInt(90, 140); d >= randInt(1, 6); d -= Math.max(2, cadence + randInt(-2, 3))) days.push(d);
  } else if (kind === "quiet") {
    const cadence = randInt(5, 12);
    const stop = randInt(22, 60);
    for (let d = randInt(100, 150); d >= stop; d -= Math.max(2, cadence + randInt(-2, 3))) days.push(d);
    if (days.length < 3) days.push(stop + 10, stop + 5, stop);
  } else {
    const n = rand() < 0.35 ? 1 : randInt(2, 4);
    for (let i = 0; i < n; i++) days.push(randInt(1, 140));
  }
  return [...new Set(days)].sort((a, b) => b - a);
}

function makeCustomers(count, mix) {
  const used = new Set();
  return Array.from({ length: count }, (_, i) => {
    let phone;
    do phone = `+1555${randInt(2000000, 9999999)}`;
    while (used.has(phone));
    used.add(phone);
    const kind = i < mix.regular ? "regular" : i < mix.regular + mix.quiet ? "quiet" : "occasional";
    return { name: `${pick(FIRST)} ${pick(LAST)}`, phone, consent: rand() < 0.72, kind };
  });
}

const VENUES = [
  {
    venue: { name: "Test Lounge", slug: "test-lounge", type: "golf_sim", reward_type: "stamps", stamps_needed: 5,
      points_per_dollar: 1, points_needed: 500, reward_text: "free bay hour" },
    customers: makeCustomers(50, { regular: 12, quiet: 8 }),
    amount: () => null,
  },
  {
    venue: { name: "Test Cages", slug: "test-cages", type: "batting_cages", reward_type: "points", stamps_needed: 5,
      points_per_dollar: 1, points_needed: 300, reward_text: "free 30-minute cage" },
    customers: makeCustomers(25, { regular: 6, quiet: 4 }),
    amount: () => pick([25, 30, 35, 40, 45, 55, 60, 75]),
  },
  {
    venue: { name: "Bayline Demo", slug: "bayline-demo", type: "golf_sim", reward_type: "stamps", stamps_needed: 5,
      points_per_dollar: 1, points_needed: 500, reward_text: "free bay hour", stamps_per_day: null,
      card_bg: "#0f1512", card_fg: "#ffffff", card_accent: "#c4f04a",
      pass_message: "Thanks for trying Bayline! Tap the stand again to watch your stamp land.", is_demo: true,
      logo_text: "Bayline", website: "https://getbayline.app" },
    customers: makeCustomers(60, { regular: 20, quiet: 10 }),
    amount: () => null,
  },
];

/** The Bayline swirl mark (public/brand) as the demo venue's logo; "Bayline" shows beside it as logo text. */
async function uploadDemoLogo(venueId) {
  const svg = readFileSync(new URL("../public/brand/bayline-mark-for-dark-bg.svg", import.meta.url));
  const png = await sharp(svg, { density: 600 }).trim().resize({ height: 300 }).png().toBuffer();
  const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  }).storage.from("venue-logos");
  const path = `${venueId}/logo-demo-mark.png`;
  const { error } = await storage.upload(path, png, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Demo logo upload failed: ${error.message}`);
  return `${storage.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

try {
  for (const { venue, customers, amount } of VENUES) {
    await sql.begin(async (tx) => {
      const [v] = await tx`
        insert into public.venues ${tx(venue)}
        on conflict (slug) do update set name = excluded.name, type = excluded.type,
          reward_type = excluded.reward_type, stamps_needed = excluded.stamps_needed,
          points_per_dollar = excluded.points_per_dollar, points_needed = excluded.points_needed,
          reward_text = excluded.reward_text, stamps_per_day = excluded.stamps_per_day,
          card_bg = excluded.card_bg, card_fg = excluded.card_fg, card_accent = excluded.card_accent,
          pass_message = excluded.pass_message, is_demo = excluded.is_demo,
          logo_text = excluded.logo_text, website = excluded.website
        returning id, name, timezone`;
      // Test venues reset completely; the demo venue keeps its real demo guests.
      if (venue.is_demo) await tx`delete from public.customers where venue_id = ${v.id} and is_seed`;
      else await tx`delete from public.customers where venue_id = ${v.id}`;

      const consentText = `I agree to receive offers by text from ${v.name}. Msg & data rates may apply. Reply STOP to opt out.`;
      const visits = [];
      for (const c of customers) {
        const offsets = visitPattern(c.kind);
        const firstLocal = localVisitTime(offsets[0]);
        const [row] = await tx`
          insert into public.customers (venue_id, name, phone, is_seed, text_consent, consent_timestamp, consent_text, created_at)
          values (${v.id}, ${c.name}, ${c.phone}, true, ${c.consent},
            ${c.consent ? tx`timezone(${v.timezone}::text, (${firstLocal}::text)::timestamp)` : null},
            ${c.consent ? consentText : null},
            timezone(${v.timezone}::text, (${firstLocal}::text)::timestamp))
          returning id`;
        offsets.forEach((d, i) => {
          const local = i === 0 ? firstLocal : localVisitTime(d);
          const amt = amount();
          visits.push({ customer_id: row.id, local, amount: amt, source: amt == null ? "qr" : pick(["staff", "staff", "qr"]) });
        });
      }
      // Oldest first. Staff redeem a full card a few minutes after the visit that fills it, so most
      // regulars aren't sitting on unclaimed rewards.
      visits.sort((a, b) => (a.local < b.local ? -1 : 1));
      const progress = new Map(); // customer -> stamps or points toward the next reward
      for (const vi of visits) {
        const [row] = await tx`
          insert into public.visits (venue_id, customer_id, visited_at, amount, source)
          values (${v.id}, ${vi.customer_id}, timezone(${v.timezone}::text, (${vi.local}::text)::timestamp),
            ${vi.source === "staff" ? vi.amount : null}, ${vi.source})
          returning visited_at, points`;
        const isPoints = venue.reward_type === "points";
        const have = (progress.get(vi.customer_id) ?? 0) + (isPoints ? row.points : 1);
        const need = isPoints ? venue.points_needed : venue.stamps_needed;
        if (have >= need && rand() < 0.85) {
          await tx`
            insert into public.rewards_redeemed (venue_id, customer_id, redeemed_at, reward_text, points_spent)
            values (${v.id}, ${vi.customer_id}, ${row.visited_at}::timestamptz + interval '5 minutes',
              ${venue.reward_text}, ${isPoints ? need : 0})`;
          progress.set(vi.customer_id, isPoints ? have - need : 0);
        } else {
          progress.set(vi.customer_id, have);
        }
      }
      if (venue.slug === "bayline-demo") {
        await tx`update public.venues set logo_url = ${await uploadDemoLogo(v.id)} where id = ${v.id}`;
      }
      console.log(`${venue.name}: ${customers.length} customers, ${visits.length} visits  →  /v/${venue.slug}`);
    });
  }
} catch (e) {
  console.error("Seed failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
