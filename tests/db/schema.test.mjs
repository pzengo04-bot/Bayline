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
  await db.query(`insert into venues (name, slug, stamps_per_day) values ('Demo','demo', null)`);
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
  for (let i = 5; i >= 3; i--) await db.query(`insert into visits (venue_id, customer_id, visited_at) values ($1,$2, now() - ($3 || ' days')::interval)`, [va.id, mike.id, i]);
  r = await tap(`'test-lounge', 'nfc', '${token}'`);
  ok(r.status === "stamped" && r.progress.reward_ready === true && r.progress.stamps === 5, "the fifth stamp fills the card: " + JSON.stringify(r.progress));
  const visitsBefore = (await db.query(`select count(*)::int n from visits where customer_id=$1`, [mike.id])).rows[0].n;
  r = await tap(`'test-lounge', 'nfc', '${token}'`);
  ok(r.status === "reward_ready" && r.progress.stamps === 5, "a tap on a full card says reward ready: " + r.status);
  ok((await db.query(`select count(*)::int n from visits where customer_id=$1`, [mike.id])).rows[0].n === visitsBefore, "and adds nothing");
  t = await tryQ("authenticated", b.id, `select redeem_reward($1)`, [mike.id]);
  ok(!!t.e, "owner B cannot redeem at venue A");
  r = await as(db, "authenticated", a.id, `select redeem_reward($1) as j`, [mike.id]);
  ok(r.rows[0].j.stamps === 0 && r.rows[0].j.reward_ready === false, "redeem resets the card");
  t = await tryQ("authenticated", a.id, `select redeem_reward($1)`, [mike.id]);
  ok(!!t.e, "can't redeem an empty card");
  r = await tap(`'test-lounge', 'nfc', '${token}'`);
  ok(r.status === "limit_reached" && r.progress.stamps === 0, "the redemption visit earns no stamp: " + r.status);
  const log = (await as(db, "authenticated", a.id, `select kind, source, actor_email, detail from card_events where customer_id=$1 order by created_at desc, kind`, [mike.id])).rows;
  ok(log.some((e) => e.kind === "redeem" && e.actor_email === "a@x.com" && e.detail === "free bay hour"), "redemption logged with who did it: " + JSON.stringify(log.slice(0, 3)));
  ok(log.some((e) => e.kind === "stamp" && e.source === "customer"), "taps logged as the customer's");
  t = await tryQ("authenticated", a.id, `insert into card_events (venue_id, customer_id, kind, source) values ($1,$2,'stamp','staff')`, [va.id, mike.id]);
  ok(!!t.e, "nobody writes the log directly");
  t = await tryQ("authenticated", b.id, `select * from card_events where venue_id=$1`, [va.id]);
  ok(!t.e && t.r.rows.length === 0, "owner B sees none of venue A's log");

  // Staff stamping, removing and resetting by hand.
  const { rows: [sam] } = await db.query(`insert into customers (venue_id, name, phone) values ($1,'Sam','+19145550177') returning id, card_code`, [va.id]);
  ok(/^[0-9A-F]{16}$/.test(sam.card_code), "each card gets a random 16-character code: " + sam.card_code);
  r = await as(db, "authenticated", a.id, `select find_card($1, $2) as j`, [va.id, sam.card_code.toLowerCase()]);
  ok(r.rows[0].j.status === "found" && r.rows[0].j.card.name === "Sam", "scanning the code finds the card");
  r = await as(db, "authenticated", b.id, `select find_card($1, $2) as j`, [vb.id, sam.card_code]);
  ok(r.rows[0].j.status === "other_venue", "another venue's scan finds nothing usable");
  t = await tryQ("authenticated", b.id, `select find_card($1, $2)`, [va.id, sam.card_code]);
  ok(!!t.e, "owner B can't scan at venue A");
  r = await as(db, "authenticated", a.id, `select stamp_customer($1) as j`, [sam.id]);
  ok(r.rows[0].j.result === "stamped" && r.rows[0].j.card.progress.stamps === 1 && r.rows[0].j.card.stamped_today, "staff add a stamp");
  r = await as(db, "authenticated", a.id, `select stamp_customer($1) as j`, [sam.id]);
  ok(r.rows[0].j.result === "limit_reached" && r.rows[0].j.card.progress.stamps === 1, "one stamp per day for staff too");
  t = await tryQ("authenticated", b.id, `select stamp_customer($1)`, [sam.id]);
  ok(!!t.e, "owner B can't stamp venue A cards");
  r = await as(db, "authenticated", a.id, `select remove_stamp($1) as j`, [sam.id]);
  ok(r.rows[0].j.progress.stamps === 0 && r.rows[0].j.visits === 1, "removing a stamp keeps the visit");
  t = await tryQ("authenticated", a.id, `select remove_stamp($1)`, [sam.id]);
  ok(!!t.e, "nothing left to remove");
  await db.query(`insert into visits (venue_id, customer_id, visited_at) values ($1,$2, now() - interval '3 days'), ($1,$2, now() - interval '2 days')`, [va.id, sam.id]);
  r = await as(db, "authenticated", a.id, `select reset_card($1) as j`, [sam.id]);
  ok(r.rows[0].j.progress.stamps === 0 && r.rows[0].j.visits === 3, "reset starts the card at 0");
  const samLog = (await as(db, "authenticated", a.id, `select kind, actor_email from card_events where customer_id=$1`, [sam.id])).rows;
  ok(["stamp", "stamp_removed", "card_reset"].every((k) => samLog.some((e) => e.kind === k && e.actor_email === "a@x.com")), "manual changes logged: " + JSON.stringify(samLog));
  r = await as(db, "authenticated", a.id, `select venue_home($1) as j`, [va.id]);
  ok(typeof r.rows[0].j.week_visits === "number" && "prev_regulars" in r.rows[0].j, "home numbers: " + JSON.stringify(r.rows[0].j));
  r = await as(db, "authenticated", a.id, `select venue_week($1, current_date - 7) as j`, [va.id]);
  ok(typeof r.rows[0].j.visits === "number", "weekly brief numbers");

  // Pass freshness bumps on stamps and on card redesign.
  const before = (await db.query(`select pass_updated_at from customers where id=$1`, [mike.id])).rows[0].pass_updated_at;
  await new Promise((res) => setTimeout(res, 20));
  await as(db, "authenticated", a.id, `update venues set card_bg = '#123456' where id = $1`, [va.id]);
  const after = (await db.query(`select pass_updated_at from customers where id=$1`, [mike.id])).rows[0].pass_updated_at;
  ok(after > before, "redesign marks passes as updated");
  await new Promise((res) => setTimeout(res, 20));
  await as(db, "authenticated", a.id, `update venues set card_reward = '#e8590c' where id = $1`, [va.id]);
  const afterReward = (await db.query(`select pass_updated_at from customers where id=$1`, [mike.id])).rows[0].pass_updated_at;
  ok(afterReward > after, "owners can set the reward color, and it redraws passes");
  const { rows: [fresh] } = await db.query(
    `insert into venues (name, slug, type) values ('Fresh', 'fresh-colors', 'cafe') returning card_bg, card_fg, card_accent, card_reward`,
  );
  ok(fresh.card_bg === "#02070a" && fresh.card_accent === "#0297de" && fresh.card_reward === "#fc734d", "new venues start on the Bayline palette");

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
  ok(r.rows[0].n === 4, "admin sees all customers");
});
