// Offer send log and recipients stay inside a venue. Usage: npm run test:db
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { as, makeDb } from "./harness.mjs";

test("offer sends, recipients and insights respect venue boundaries", async () => {
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
  const { rows: [staff] } = await db.query(`insert into auth.users (email) values ('s@x.com') returning id`);
  const { rows: [va] } = await db.query(`insert into venues (name, slug) values ('A', 'a') returning id`);
  const { rows: [vb] } = await db.query(`insert into venues (name, slug) values ('B', 'b') returning id`);
  await db.query(`insert into venue_members values ($1,$2,'owner'), ($3,$4,'owner'), ($5,$2,'staff')`, [a.id, va.id, b.id, vb.id, staff.id]);
  const { rows: [cb] } = await db.query(`insert into customers (venue_id, name, phone) values ($1, 'Bea', '+19145550001') returning id`, [vb.id]);
  const { rows: [sb] } = await db.query(
    `insert into offer_sends (venue_id, audience, message, created_by) values ($1, 'everyone', 'Hi', $2) returning id`,
    [vb.id, b.id],
  );
  await db.query(`insert into offer_recipients (send_id, customer_id, venue_id, status) values ($1, $2, $3, 'delivered')`, [sb.id, cb.id, vb.id]);

  let r = await as(db, "authenticated", a.id, `select * from offer_sends`);
  assert.equal(r.rows.length, 0, "A can't read B's send log");
  r = await as(db, "authenticated", a.id, `select * from offer_recipients`);
  assert.equal(r.rows.length, 0, "A can't read B's recipients");
  r = await as(db, "authenticated", a.id, `select * from offer_send_results`);
  assert.equal(r.rows.length, 0, "A can't read B's results");
  r = await as(db, "authenticated", a.id, `select * from customer_insights where venue_id = $1`, [vb.id]);
  assert.equal(r.rows.length, 0, "A can't read B's customer labels");
  assert.ok(
    await fails("authenticated", a.id, `insert into offer_sends (venue_id, audience, message, created_by) values ($1, 'everyone', 'x', $2)`, [vb.id, a.id]),
    "A can't send for B",
  );
  assert.ok(
    await fails("authenticated", staff.id, `insert into offer_sends (venue_id, audience, message, created_by) values ($1, 'everyone', 'x', $2)`, [va.id, staff.id]),
    "staff can't send offers",
  );
  assert.ok(
    await fails("authenticated", a.id, `insert into offer_sends (venue_id, audience, message, created_by) values ($1, 'everyone', 'x', $2)`, [va.id, b.id]),
    "a send must be logged under the sender's own id",
  );
  r = await as(db, "authenticated", a.id, `insert into offer_sends (venue_id, audience, message, created_by) values ($1, 'everyone', 'Come back!', $2) returning id`, [va.id, a.id]);
  assert.ok(r.rows[0].id, "owner can send for own venue");
  assert.ok(await fails("authenticated", a.id, `select * from voided_passes`), "voided passes are server-only");
  r = await as(db, "authenticated", b.id, `select came_back from offer_send_results`);
  assert.equal(r.rows[0].came_back, 0);
});
