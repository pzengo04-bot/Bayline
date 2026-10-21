// Milestone reward and head start: card cycles, one redemption of each per cycle, and head-start
// stamps that never count as visits. Usage: npm run test:db
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { as, makeDb } from "./harness.mjs";

test("milestone, head start and card cycles", async () => {
  const db = await makeDb(path.join(import.meta.dirname, "..", "..", "supabase", "migrations"));
  const { rows: [owner] } = await db.query(`insert into auth.users (email) values ('o@x.com') returning id`);
  const { rows: [v] } = await db.query(
    `insert into venues (name, slug, stamps_needed, stamps_per_day, milestone_text, milestone_at, head_start_stamps)
     values ('Lounge', 'lounge', 6, null, 'free pitcher', 3, 2) returning id`,
  );
  await db.query(`insert into venue_members values ($1, $2, 'owner')`, [owner.id, v.id]);

  // Join with a head start of 2: the first tap makes 3 stamps, which reaches the milestone.
  const { rows: [{ tap: joined }] } = await db.query(`select tap('lounge', 'qr', null, '+19145550100', 'Mia') as tap`);
  assert.equal(joined.status, "joined");
  assert.equal(joined.head_start, 2);
  assert.equal(joined.progress.stamps, 3);
  assert.deepEqual(joined.progress.milestone, { at: 3, text: "free pitcher", ready: true, redeemed: false });
  const cust = joined.customer_id;

  // Head-start stamps are not visits.
  const { rows: [stats] } = await as(db, "authenticated", owner.id, `select visits, stamps from customer_stats where id = $1`, [cust]);
  assert.equal(stats.visits, 1);
  assert.equal(stats.stamps, 3);

  const tap = async () => (await db.query(`select tap('lounge', 'qr', $1) as t`, [joined.return_token])).rows[0].t;
  const redeem = (kind) => as(db, "authenticated", owner.id, `select redeem_reward($1, $2) as p`, [cust, kind]);

  // Forgetting to redeem the milestone doesn't block stamps; it stays ready.
  let t = await tap();
  assert.equal(t.progress.stamps, 4);
  assert.equal(t.progress.milestone.ready, true);

  // Redeem it once; a second time fails.
  let { rows: [{ p }] } = await redeem("milestone");
  assert.equal(p.milestone.ready, false);
  assert.equal(p.milestone.redeemed, true);
  await assert.rejects(redeem("milestone"), /not ready/);
  await assert.rejects(redeem("main"), /not ready/);

  await tap();
  t = await tap();
  assert.equal(t.progress.reward_ready, true);
  ({ rows: [{ p }] } = await redeem("main"));
  assert.equal(p.stamps, 0, "new cycle, and the head start doesn't come back");
  assert.equal(p.milestone.redeemed, false);
  assert.equal(p.milestone.ready, false);

  // Next cycle: the milestone unlocks again at stamp 3.
  for (let i = 0; i < 3; i++) t = await tap();
  assert.equal(t.progress.milestone.ready, true);

  const { rows: kinds } = await db.query(`select kind from rewards_redeemed where customer_id = $1 order by redeemed_at`, [cust]);
  assert.deepEqual(kinds.map((r) => r.kind), ["milestone", "main"]);

  // A milestone at or past the goal is ignored.
  await db.query(`update venues set milestone_at = 6 where id = $1`, [v.id]);
  t = await tap();
  assert.equal(t.progress.milestone, null);

  // Points venues: no head start.
  await db.query(`update venues set reward_type = 'points', milestone_at = 50, milestone_text = 'free drink' where id = $1`, [v.id]);
  const { rows: [{ tap: pts }] } = await db.query(`select tap('lounge', 'qr', null, '+19145550101', 'Sam') as tap`);
  assert.equal(pts.head_start, 0);
});
