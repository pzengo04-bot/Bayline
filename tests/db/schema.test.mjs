// Runs the migrations in an in-memory Postgres and checks check-in, rewards and the security rules.
// No Supabase project needed. Usage: npm run test:db
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { as, makeDb } from "./harness.mjs";

test("schema, check-in, rewards and row level security", async () => {
  const db = await makeDb(path.join(import.meta.dirname, "..", "..", "supabase", "migrations"));
  const ok = (cond, msg) => assert.ok(cond, msg);
  const tryQ = async (...a) => { try { return { r: await as(db, ...a) }; } catch (e) { return { e: e.message }; } };

  const { rows: [a] } = await db.query(`insert into auth.users (email) values ('a@x.com') returning id`);
  const { rows: [b] } = await db.query(`insert into auth.users (email) values ('b@x.com') returning id`);
  const { rows: [adm] } = await db.query(`insert into auth.users (email) values ('admin@x.com') returning id`);
  await db.query(`insert into platform_admins values ($1)`, [adm.id]);
  const { rows: [va] } = await db.query(`insert into venues (name, slug) values ('Test Lounge','test-lounge') returning id`);
  const { rows: [vb] } = await db.query(`insert into venues (name, slug, reward_type, points_per_dollar, points_needed, reward_text) values ('Test Cages','test-cages','points',1,100,'free cage session') returning id`);
  await db.query(`insert into venue_members values ($1,$2,'owner'), ($3,$4,'owner')`, [a.id, va.id, b.id, vb.id]);

  // anon check-in flow
  let r = await as(db, "anon", null, `select check_in('test-lounge', '+19145550123') as j`);
  ok(r.rows[0].j.status === "new_customer", "unknown phone asks for name");
  r = await as(db, "anon", null, `select check_in('test-lounge', '+19145550123', 'Mike Reynolds', true) as j`);
  ok(r.rows[0].j.status === "checked_in" && r.rows[0].j.is_new && r.rows[0].j.first_name === "Mike", "new customer checked in: " + JSON.stringify(r.rows[0].j));
  r = await as(db, "anon", null, `select check_in('test-lounge', '+19145550123') as j`);
  ok(r.rows[0].j.status === "too_soon", "repeat within 2h blocked");
  r = await as(db, "anon", null, `select get_checkin_venue('test-lounge') as j`);
  ok(r.rows[0].j.consent_text.includes("from Test Lounge."), "venue info + consent text");
  r = await as(db, "anon", null, `select check_in('nope', '+19145550123') as j`);
  ok(r.rows[0].j.status === "venue_not_found", "unknown venue");
  let t = await tryQ("anon", null, `select * from customers`);
  ok(!!t.e, "anon cannot read customers: " + t.e);
  t = await tryQ("anon", null, `select private.customer_progress(gen_random_uuid())`);
  ok(!!t.e, "anon cannot call private helpers");

  // stamps: push Mike to 5 visits by backdating visits
  const { rows: [mike] } = await db.query(`select id from customers where phone='+19145550123'`);
  await db.query(`update visits set visited_at = now() - interval '5 days' where customer_id=$1`, [mike.id]);
  for (let i = 4; i >= 2; i--) await db.query(`insert into visits (venue_id, customer_id, visited_at) values ($1,$2, now() - ($3 || ' days')::interval)`, [va.id, mike.id, i]);
  r = await as(db, "anon", null, `select check_in('test-lounge', '+19145550123') as j`);
  ok(r.rows[0].j.reward_unlocked === true && r.rows[0].j.progress.stamps === 0, "5th visit unlocks reward and resets: " + JSON.stringify(r.rows[0].j));
  const consent = await db.query(`select text_consent, consent_text, consent_timestamp from customers where id=$1`, [mike.id]);
  ok(consent.rows[0].text_consent && consent.rows[0].consent_text.startsWith("I agree"), "consent saved verbatim");

  // points venue
  await as(db, "anon", null, `select check_in('test-cages', '+19145550199', 'Dana', false)`);
  const { rows: [dana] } = await db.query(`select id, text_consent from customers where phone='+19145550199' and venue_id=$1`, [vb.id]);
  ok(dana.text_consent === false, "no consent when unchecked");
  await as(db, "authenticated", b.id, `insert into visits (venue_id, customer_id, amount, source) values ($1,$2,62.50,'staff')`, [vb.id, dana.id]);
  const pts = await db.query(`select points from visits where customer_id=$1 and source='staff'`, [dana.id]);
  ok(pts.rows[0].points === 62, "points computed from amount: " + pts.rows[0].points);

  // RLS: owner A vs venue B
  r = await as(db, "authenticated", a.id, `select venue_id from customers`);
  ok(r.rows.length > 0 && r.rows.every((x) => x.venue_id === va.id), "owner A sees only venue A customers (" + r.rows.length + ")");
  r = await as(db, "authenticated", a.id, `select * from customers where venue_id=$1`, [vb.id]);
  ok(r.rows.length === 0, "owner A gets nothing when asking for venue B customers");
  r = await as(db, "authenticated", a.id, `select * from visits where venue_id=$1`, [vb.id]);
  ok(r.rows.length === 0, "owner A sees no venue B visits");
  r = await as(db, "authenticated", a.id, `select * from venues`);
  ok(r.rows.length === 1 && r.rows[0].id === va.id, "owner A sees only own venue");
  t = await tryQ("authenticated", a.id, `insert into customers (venue_id, name, phone) values ($1,'Sneaky','+19145550111')`, [vb.id]);
  ok(!!t.e, "owner A cannot add customers to venue B: " + t.e);
  t = await tryQ("authenticated", a.id, `insert into visits (venue_id, customer_id) values ($1,$2)`, [va.id, dana.id]);
  ok(!!t.e, "owner A cannot attach venue B customer to venue A visit");
  r = await as(db, "authenticated", a.id, `update venues set reward_text='hacked' where id=$1 returning id`, [vb.id]);
  ok(r.rows.length === 0, "owner A cannot update venue B");
  t = await tryQ("authenticated", a.id, `update venues set slug='new-slug' where id=$1`, [va.id]);
  ok(!!t.e, "owner cannot change slug: " + t.e);
  r = await as(db, "authenticated", a.id, `update venues set stamps_needed=8 where id=$1 returning stamps_needed`, [va.id]);
  ok(r.rows[0]?.stamps_needed === 8, "owner can change reward settings");
  t = await tryQ("authenticated", b.id, `update customers set text_consent=true where id=$1`, [dana.id]);
  ok(!!t.e, "staff cannot fake consent: " + t.e);
  t = await tryQ("authenticated", a.id, `select private.customer_progress($1)`, [dana.id]);
  ok(!!t.e, "owner A cannot read venue B progress via helper");
  t = await tryQ("authenticated", a.id, `insert into venue_members values ($1,$2,'owner')`, [a.id, vb.id]);
  ok(!!t.e, "owner A cannot add themselves to venue B");
  r = await as(db, "authenticated", adm.id, `select count(*)::int n from customers`);
  ok(r.rows[0].n === 2, "admin sees all customers");
});
