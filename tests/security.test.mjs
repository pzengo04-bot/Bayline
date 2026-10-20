// Proves Row Level Security keeps venues apart, against the real Supabase project.
// Creates two throwaway venues and owners, signs in as each, and checks what they can reach.
// Usage: npm run test:security
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient(URL, SECRET, opts);
const run = Math.random().toString(36).slice(2, 8);
const fixtures = { venues: [], users: [] };

/** Make a venue with one owner and two customers; return a client signed in as that owner. */
async function venueWithOwner(label) {
  const { data: venue, error: ve } = await admin
    .from("venues")
    .insert({ name: `RLS test ${label}`, slug: `rls-test-${label}-${run}` })
    .select()
    .single();
  if (ve) throw ve;
  fixtures.venues.push(venue.id);

  const email = `rls-${label}-${run}@example.com`;
  const { data: created, error: ue } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (ue) throw ue;
  fixtures.users.push(created.user.id);

  await admin.from("venue_members").insert({ user_id: created.user.id, venue_id: venue.id, role: "owner" }).throwOnError();
  const prefix = label === "a" ? "+1555201" : "+1555202";
  await admin
    .from("customers")
    .insert([
      { venue_id: venue.id, name: `${label} one`, phone: `${prefix}0001` },
      { venue_id: venue.id, name: `${label} two`, phone: `${prefix}0002` },
    ])
    .throwOnError();

  // Sign in without email: generate a magic-link token and redeem it.
  const { data: link, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (le) throw le;
  const client = createClient(URL, PUBLISHABLE, opts);
  const { error: se } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (se) throw se;
  return { venue, client };
}

describe("venue data stays separate", () => {
  let A;
  let B;

  before(async () => {
    A = await venueWithOwner("a");
    B = await venueWithOwner("b");
  });

  after(async () => {
    if (fixtures.venues.length) await admin.from("venues").delete().in("id", fixtures.venues);
    for (const id of fixtures.users) await admin.auth.admin.deleteUser(id);
  });

  test("owner of venue A sees only venue A's customers", async () => {
    const { data, error } = await A.client.from("customers").select("venue_id, name");
    assert.ifError(error);
    assert.equal(data.length, 2);
    assert.ok(data.every((c) => c.venue_id === A.venue.id));
  });

  test("owner of venue A cannot see venue B's customers, even by asking directly", async () => {
    const { data, error } = await A.client.from("customers").select("*").eq("venue_id", B.venue.id);
    assert.ifError(error);
    assert.deepEqual(data, []);
  });

  test("owner of venue A cannot see venue B itself", async () => {
    const { data } = await A.client.from("venues").select("id");
    assert.deepEqual(data.map((v) => v.id), [A.venue.id]);
  });

  test("owner of venue A cannot add a customer to venue B", async () => {
    const { error } = await A.client.from("customers").insert({ venue_id: B.venue.id, name: "Sneaky", phone: "+15552030003" });
    assert.ok(error, "insert should be rejected");
  });

  test("owner of venue A cannot change venue B's rewards", async () => {
    const { data } = await A.client.from("venues").update({ reward_text: "hacked" }).eq("id", B.venue.id).select();
    assert.deepEqual(data, []);
  });

  test("anonymous visitors cannot read customers at all", async () => {
    const anon = createClient(URL, PUBLISHABLE, opts);
    const { data, error } = await anon.from("customers").select("*");
    assert.ok(error || data.length === 0);
  });
});
