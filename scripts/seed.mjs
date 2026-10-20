// Creates (or resets) two test venues with fake customers and realistic visit times:
//   Test Lounge  (/v/test-lounge)  golf sims, visit stamps, ~50 customers
//   Test Cages   (/v/test-cages)   batting cages, points per dollar, ~25 customers
// Usage: npm run db:seed   (safe to re-run; only touches these two venues)
import postgres from "postgres";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Missing SUPABASE_DB_URL in .env.local (see docs/SETUP.md, step 2).");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });

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
/** Local wall-clock time `daysAgo` days back, at a realistic hour, as "YYYY-MM-DD HH:MM". */
function localVisitTime(daysAgo) {
  const d = new Date(today.getTime() - daysAgo * 86_400_000);
  const dow = d.getDay();
  const weekend = dow === 0 || dow === 6 || (dow === 5 && rand() < 0.5);
  const hour = pickHour(weekend);
  const ymd = d.toISOString().slice(0, 10);
  return `${ymd} ${String(hour).padStart(2, "0")}:${pick(["00", "05", "15", "30", "45", "50"])}`;
}

/** Days-ago offsets for one customer's visits, newest last. */
function visitPattern(kind) {
  const days = [];
  if (kind === "regular") {
    const cadence = randInt(4, 9);
    for (let d = randInt(90, 140); d >= randInt(0, 6); d -= Math.max(2, cadence + randInt(-2, 3))) days.push(d);
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
];

try {
  for (const { venue, customers, amount } of VENUES) {
    await sql.begin(async (tx) => {
      const [v] = await tx`
        insert into public.venues ${tx(venue)}
        on conflict (slug) do update set name = excluded.name, type = excluded.type,
          reward_type = excluded.reward_type, stamps_needed = excluded.stamps_needed,
          points_per_dollar = excluded.points_per_dollar, points_needed = excluded.points_needed,
          reward_text = excluded.reward_text
        returning id, name, timezone`;
      await tx`delete from public.customers where venue_id = ${v.id}`;

      const consentText = `I agree to receive offers by text from ${v.name}. Msg & data rates may apply. Reply STOP to opt out.`;
      const visits = [];
      for (const c of customers) {
        const offsets = visitPattern(c.kind);
        const firstLocal = localVisitTime(offsets[0]);
        const [row] = await tx`
          insert into public.customers (venue_id, name, phone, text_consent, consent_timestamp, consent_text, created_at)
          values (${v.id}, ${c.name}, ${c.phone}, ${c.consent},
            ${c.consent ? tx`(${firstLocal}::timestamp at time zone ${v.timezone})` : null},
            ${c.consent ? consentText : null},
            (${firstLocal}::timestamp at time zone ${v.timezone}))
          returning id`;
        offsets.forEach((d, i) => {
          const local = i === 0 ? firstLocal : localVisitTime(d);
          const amt = amount();
          visits.push({ customer_id: row.id, local, amount: amt, source: amt == null ? "qr" : pick(["staff", "staff", "qr"]) });
        });
      }
      // Oldest first, so stamp rewards unlock in the right order.
      visits.sort((a, b) => (a.local < b.local ? -1 : 1));
      for (const vi of visits) {
        await tx`
          insert into public.visits (venue_id, customer_id, visited_at, amount, source)
          values (${v.id}, ${vi.customer_id}, (${vi.local}::timestamp at time zone ${v.timezone}),
            ${vi.source === "staff" ? vi.amount : null}, ${vi.source})`;
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
