// Dashboard read models and staff desk functions, in an in-memory Postgres. Usage: npm run test:db
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { as, makeDb } from "./harness.mjs";

test("dashboard stats, heatmap and staff desk respect venue boundaries", async () => {
  const db = await makeDb(path.join(import.meta.dirname, "..", "..", "supabase", "migrations"));
  const fails = async (...a) => {
    try {
      await as(db, ...a);
      return false;
    } catch {
      return true;
    }
  };

  const { rows: [a] } = await db.query(`insert into auth.users (email) values ('a@x.com') returning id`);
  const { rows: [b] } = await db.query(`insert into auth.users (email) values ('b@x.com') returning id`);
  const { rows: [va] } = await db.query(`insert into venues (name, slug) values ('Lounge', 'lounge') returning id`);
  const { rows: [vb] } = await db.query(
    `insert into venues (name, slug, reward_type, points_per_dollar, points_needed, reward_text)
     values ('Cages', 'cages', 'points', 2, 100, 'free cage') returning id`,
  );
  await db.query(`insert into venue_members values ($1, $2, 'owner'), ($3, $4, 'staff')`, [a.id, va.id, b.id, vb.id]);

  // Venue A: one regular with 3 visits at 7pm New York time, last seen 30 days ago.
  const { rows: [c1] } = await db.query(
    `insert into customers (venue_id, name, phone, text_consent, consent_timestamp, consent_text)
     values ($1, 'Mike R', '+19145550001', true, now(), 'x') returning id`,
    [va.id],
  );
  for (const days of [50, 40, 30]) {
    await db.query(
      `insert into visits (venue_id, customer_id, visited_at)
       values ($1, $2, ((now() at time zone 'America/New_York')::date - $3::int + time '19:00') at time zone 'America/New_York')`,
      [va.id, c1.id, days],
    );
  }

  let r = await as(db, "authenticated", a.id, `select * from customer_stats`);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].visits, 3);
  assert.equal(r.rows[0].stamps, 3);

  r = await as(db, "authenticated", a.id, `select * from visit_heatmap($1, 60)`, [va.id]);
  assert.equal(r.rows.length > 0 && r.rows.every((x) => x.hour === 19), true, "heatmap uses venue local time");

  r = await as(db, "authenticated", a.id, `select venue_overview($1) as j`, [va.id]);
  assert.equal(r.rows[0].j.active_customers, 1);

  // Staff at venue B adds visits with amounts; points at 2 per dollar.
  r = await as(db, "authenticated", b.id, `select add_visit($1, '+19145550002', 40, 'Dana') as j`, [vb.id]);
  assert.equal(r.rows[0].j.progress.points, 80);
  r = await as(db, "authenticated", b.id, `select add_visit($1, '+19145550002', 15) as j`, [vb.id]);
  assert.equal(r.rows[0].j.progress.points, 110);
  const dana = r.rows[0].j.customer_id;
  r = await as(db, "authenticated", b.id, `select redeem_points_reward($1) as j`, [dana]);
  assert.equal(r.rows[0].j.points, 10, "redeeming spends 100 points");
  assert.ok(await fails("authenticated", b.id, `select redeem_points_reward($1)`, [dana]), "can't redeem without enough points");

  // Cross-venue attempts.
  assert.ok(await fails("authenticated", a.id, `select add_visit($1, '+19145550003', 10, 'X')`, [vb.id]), "A can't add visits at B");
  assert.ok(await fails("authenticated", a.id, `select lookup_customer($1, '+19145550002')`, [vb.id]), "A can't look up B customers");
  assert.ok(await fails("authenticated", a.id, `select redeem_points_reward($1)`, [dana]), "A can't redeem at B");
  r = await as(db, "authenticated", a.id, `select * from customer_stats where venue_id = $1`, [vb.id]);
  assert.equal(r.rows.length, 0, "A sees no B stats");
  r = await as(db, "authenticated", a.id, `select * from visit_heatmap($1)`, [vb.id]);
  assert.equal(r.rows.length, 0, "A sees no B heatmap");
  r = await as(db, "authenticated", a.id, `select * from venue_activity()`);
  assert.deepEqual(r.rows.map((x) => x.venue_id), [va.id]);
  assert.ok(await fails("anon", null, `select * from customer_stats`), "anon can't read stats");
  assert.ok(await fails("anon", null, `select venue_overview($1)`, [va.id]), "anon can't call dashboard functions");
});
