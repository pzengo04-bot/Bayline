// Runs the migrations in an in-memory Postgres and checks taps, rewards and the security rules.
// No Supabase project needed. Usage: npm run test:db
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { as, makeDb } from "./harness.mjs";

test("schema, taps, rewards and row level security", async () => {
  const db = await makeDb(path.join(import.meta.dirname, "..", "..", "supabase", "migrations"));
  const ok = (cond, msg) => assert.ok(cond, msg);
  const tryQ = async (...a) => { try { return { r: await as(db, ...a) }; } catch (e) { return { e: e.message }; } };
  const tap = async (args) => (await as(db, "anon", null, `select tap(${args}) as j`)).rows[0].j;

  const { rows: [a] } = await db.query(`insert into auth.users (email) values ('a@x.com') returning id`);
  const { rows: [b] } = await db.query(`insert into auth.users (email) values ('b@x.com') returning id`);
  const { rows: [adm] } = await db.query(`insert into auth.users (email) values ('admin@x.com') returning id`);
  await db.query(`insert into platform_admins values ($1)`, [adm.id]);
  const { rows: [va] } = await db.query(`insert into venues (name, slug) values ('Test Lounge','test-lounge') returning id`);
  const { rows: [vb] } = await db.query(`insert into venues (name, slug, reward_type, points_per_dollar, points_per_visit, points_needed, reward_text) values ('Test Cages','test-cages','points',1,25,100,'free cage session') returning id`);
  const { rows: [vd] } = await db.query(`insert into venues (name, slug, stamps_per_day) values ('Demo','demo', null) returning id`);
  await db.query(`insert into venue_members values ($1,$2,'owner'), ($3,$4,'owner')`, [a.id, va.id, b.id, vb.id]);

  // Join, return by cookie, daily limit.
  let r = await tap(`'test-lounge', 'nfc'`);
  ok(r.status === "need_details", "first tap without cookie asks for details");
  r = await tap(`'test-lounge', 'nfc', null, '+19145550123'`);
  ok(r.status === "need_name", "unknown phone asks for a name");
  r = await tap(`'test-lounge', 'nfc', null, '+19145550123', 'Mike Reynolds'`);
  ok(r.status === "joined" && r.first_name === "Mike" && r.progress.stamps === 1, "joined with first stamp: " + JSON.stringify(r));
  const token = r.return_token;
  r = await tap(`'test-lounge', 'nfc', '${token}'`);
  ok(r.status === "limit_reached" && r.progress.stamps === 1, "second tap the same day is limited");
  r = await tap(`'test-lounge', 'qr', null, '+19145550123'`);
  ok(r.status === "limit_reached", "phone match is limited too");
  r = await tap(`'nope', 'nfc'`);
  ok(r.status === "venue_not_found", "unknown venue");
  r = await tap(`'test-lounge', 'web', '${token}'`);
  ok(r.status === "limit_reached", "token still recognized");

  // Demo venue: unlimited taps.
  r = await tap(`'demo', 'nfc', null, '+19145550123', 'Mike'`);
  const demoToken = r.return_token;
  r = await tap(`'demo', 'nfc', '${demoToken}'`);
  ok(r.status === "stamped" && r.progress.stamps === 2, "demo venue allows repeat taps");
  ok(r.return_token === demoToken, "same customer");

  const taps = await db.query(`select result, source from taps where venue_id = $1 order by created_at`, [va.id]);
  ok(taps.rows.length === 5 && taps.rows.some((t) => t.result === "limit_reached"), "every tap is logged: " + taps.rows.length);

  let t = await tryQ("anon", null, `select id from customers`);
  ok(!!t.e, "anon cannot read customers: " + t.e);
  t = await tryQ("anon", null, `select private.customer_progress(gen_random_uuid())`);
  ok(!!t.e, "anon cannot call private helpers");
  t = await tryQ("anon", null, `select wallet_pass_data(gen_random_uuid())`);
  ok(!!t.e, "anon cannot read wallet pass data");
  t = await tryQ("authenticated", a.id, `select return_token from customers`);
  ok(!!t.e, "owners cannot read customers' return tokens");
  t = await tryQ("authenticated", a.id, `select apple_auth_token from customers`);
  ok(!!t.e, "owners cannot read Apple auth tokens");
  t = await tryQ("authenticated", a.id, `select * from apple_registrations`);
  ok(!!t.e, "owners cannot read device registrations");

  // Reward ready: fill the card with past visits, then staff redeem.
  const { rows: [mike] } = await db.query(`select id from customers where phone='+19145550123' and venue_id=$1`, [va.id]);
  await db.query(`update visits set visited_at = now() - interval '6 days' where customer_id=$1`, [mike.id]);
  for (let i = 5; i >= 2; i--) await db.query(`insert into visits (venue_id, customer_id, visited_at) values ($1,$2, now() - ($3 || ' days')::interval)`, [va.id, mike.id, i]);
  r = await tap(`'test-lounge', 'nfc', '${token}'`);
  ok(r.status === "stamped" && r.progress.reward_ready === true && r.progress.stamps === 5, "full card shows reward ready (capped): " + JSON.stringify(r.progress));
  t = await tryQ("authenticated", b.id, `select redeem_reward($1)`, [mike.id]);
  ok(!!t.e, "owner B cannot redeem at venue A");
  r = await as(db, "authenticated", a.id, `select redeem_reward($1) as j`, [mike.id]);
  ok(r.rows[0].j.stamps === 0 && r.rows[0].j.reward_ready === false, "redeem resets the card");
  t = await tryQ("authenticated", a.id, `select redeem_reward($1)`, [mike.id]);
  ok(!!t.e, "can't redeem an empty card");

  // Pass freshness bumps on stamps and on card redesign.
  const before = (await db.query(`select pass_updated_at from customers where id=$1`, [mike.id])).rows[0].pass_updated_at;
  await new Promise((res) => setTimeout(res, 20));
  await as(db, "authenticated", a.id, `update venues set card_bg = '#123456' where id = $1`, [va.id]);
  const after = (await db.query(`select pass_updated_at from customers where id=$1`, [mike.id])).rows[0].pass_updated_at;
  ok(after > before, "redesign marks passes as updated");

  // Points venue: taps earn points per visit, staff amounts earn per dollar.
  r = await tap(`'test-cages', 'qr', null, '+19145550199', 'Dana'`);
  ok(r.progress.points === 25, "tap earns points per visit: " + r.progress.points);
  const dana = r.customer_id;
  await as(db, "authenticated", b.id, `insert into visits (venue_id, customer_id, amount, source) values ($1,$2,62.50,'staff')`, [vb.id, dana]);
  const pts = await db.query(`select points from visits where customer_id=$1 and source='staff'`, [dana]);
  ok(pts.rows[0].points === 62, "points computed from amount: " + pts.rows[0].points);

  // RLS: owner A vs venue B
  r = await as(db, "authenticated", a.id, `select venue_id from customers`);
  ok(r.rows.length > 0 && r.rows.every((x) => x.venue_id === va.id), "owner A sees only venue A customers (" + r.rows.length + ")");
  r = await as(db, "authenticated", a.id, `select id, name from customers where venue_id=$1`, [vb.id]);
  ok(r.rows.length === 0, "owner A gets nothing when asking for venue B customers");
  r = await as(db, "authenticated", a.id, `select * from visits where venue_id=$1`, [vb.id]);
  ok(r.rows.length === 0, "owner A sees no venue B visits");
  r = await as(db, "authenticated", a.id, `select * from taps where venue_id=$1`, [vb.id]);
  ok(r.rows.length === 0, "owner A sees no venue B taps");
  r = await as(db, "authenticated", a.id, `select id from venues`);
  ok(r.rows.length === 1 && r.rows[0].id === va.id, "owner A sees only own venue");
  t = await tryQ("authenticated", a.id, `insert into customers (venue_id, name, phone) values ($1,'Sneaky','+19145550111')`, [vb.id]);
  ok(!!t.e, "owner A cannot add customers to venue B: " + t.e);
  t = await tryQ("authenticated", a.id, `insert into visits (venue_id, customer_id) values ($1,$2)`, [va.id, dana]);
  ok(!!t.e, "owner A cannot attach venue B customer to venue A visit");
  r = await as(db, "authenticated", a.id, `update venues set reward_text='hacked' where id=$1 returning id`, [vb.id]);
  ok(r.rows.length === 0, "owner A cannot update venue B");
  t = await tryQ("authenticated", a.id, `update venues set slug='new-slug' where id=$1`, [va.id]);
  ok(!!t.e, "owner cannot change slug: " + t.e);
  t = await tryQ("authenticated", a.id, `update venues set stamps_per_day=null where id=$1`, [va.id]);
  ok(!!t.e, "owner cannot turn off the daily limit");
  r = await as(db, "authenticated", a.id, `update venues set stamps_needed=8 where id=$1 returning stamps_needed`, [va.id]);
  ok(r.rows[0]?.stamps_needed === 8, "owner can change reward settings");
  t = await tryQ("authenticated", b.id, `update customers set text_consent=true where id=$1`, [dana]);
  ok(!!t.e, "staff cannot fake consent: " + t.e);
  t = await tryQ("authenticated", a.id, `insert into venue_members values ($1,$2,'owner')`, [a.id, vb.id]);
  ok(!!t.e, "owner A cannot add themselves to venue B");
  r = await as(db, "authenticated", adm.id, `select count(*)::int n from customers`);
  ok(r.rows[0].n === 3, "admin sees all customers");
});
