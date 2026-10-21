// Customer rhythm + label rules, with edge cases. Usage: npm run test:db
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { as, makeDb } from "./harness.mjs";

test("customer labels: new, regular, slipping, vip, lapsed, occasional, demo guest", async () => {
  const db = await makeDb(path.join(import.meta.dirname, "..", "..", "supabase", "migrations"));
  const { rows: [owner] } = await db.query(`insert into auth.users (email) values ('o@x.com') returning id`);
  const { rows: [v] } = await db.query(`insert into venues (name, slug) values ('Lounge', 'lounge') returning id`);
  const { rows: [demo] } = await db.query(`insert into venues (name, slug, is_demo, stamps_per_day) values ('Demo', 'demo', true, null) returning id`);
  await db.query(`insert into venue_members values ($1, $2, 'owner'), ($1, $3, 'owner')`, [owner.id, v.id, demo.id]);

  let n = 0;
  /** A customer with visits N calendar days ago (at noon, venue time). */
  async function customer(label, daysAgo, venueId = v.id, isSeed = false) {
    const phone = `+1914555${String(1000 + n++).padStart(4, "0")}`;
    const { rows: [c] } = await db.query(
      `insert into customers (venue_id, name, phone, is_seed) values ($1, $2, $3, $4) returning id`,
      [venueId, label, phone, isSeed],
    );
    for (const d of daysAgo) {
      await db.query(
        `insert into visits (venue_id, customer_id, visited_at)
         values ($1, $2, ((now() at time zone 'America/New_York')::date - $3::int + time '12:00') at time zone 'America/New_York')`,
        [venueId, c.id, d],
      );
    }
    return c.id;
  }
  const every = (start, step, count) => Array.from({ length: count }, (_, i) => start + i * step);

  const ids = {
    newOne: await customer("new: 1 visit, 3 days ago", [3]),
    newTwo: await customer("new: 2 visits, first 20 days ago", [20, 5]),
    occasional: await customer("occasional: 2 visits, first 40 days ago", [40, 10]),
    twoVisitsLongGap: await customer("2 visits never slip (no rhythm)", [60, 50]),
    exactly2x: await customer("rhythm 7, last seen 14 days = exactly 2x", every(14, 7, 4).reverse()),
    just13: await customer("rhythm 5, last seen 13 days (under the 14-day minimum)", every(13, 5, 4).reverse()),
    just14: await customer("rhythm 5, last seen 14 days", every(14, 5, 4).reverse()),
    slip119: await customer("rhythm 3, last seen 119 days", [125, 122, 119]),
    lapsed120: await customer("rhythm 3, last seen 120 days", [126, 123, 120]),
    vip: await customer("vip: 8 visits in 90 days, recent", every(2, 4, 8).reverse()),
    regular: await customer("regular: 4 visits, on rhythm", [30, 20, 10, 3]),
  };
  // Pad the venue so the top 10% is a single customer.
  for (let i = 0; i < 6; i++) await customer(`filler ${i}`, [100 + i]);
  const guest = await customer("demo guest", [1], demo.id, false);
  const seeded = await customer("demo seed", [1], demo.id, true);

  const { rows } = await as(db, "authenticated", owner.id, `select id, label, rhythm_days, days_since from customer_insights`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const label = (id) => byId.get(id).label;

  assert.equal(label(ids.newOne), "new");
  assert.equal(label(ids.newTwo), "new");
  assert.equal(label(ids.occasional), "occasional", "1-2 visits, first over 30 days ago, seen recently");
  assert.equal(label(ids.twoVisitsLongGap), "occasional", "2 visits have no rhythm, so they can't slip");
  assert.equal(byId.get(ids.exactly2x).rhythm_days, 7);
  assert.equal(byId.get(ids.exactly2x).days_since, 14);
  assert.equal(label(ids.exactly2x), "regular", "exactly 2x rhythm is not slipping");
  assert.equal(label(ids.just13), "regular", "13 days is under the 14-day minimum");
  assert.equal(label(ids.just14), "slipping", "14 days and over 2x rhythm");
  assert.equal(label(ids.slip119), "slipping", "119 days is still slipping");
  assert.equal(label(ids.lapsed120), "lapsed", "120+ days is lapsed");
  assert.equal(label(ids.vip), "vip");
  assert.equal(label(ids.regular), "regular");
  assert.equal(label(guest), "demo_guest", "real joiners at the demo venue");
  assert.notEqual(label(seeded), "demo_guest", "seeded demo customers get normal labels");
});
