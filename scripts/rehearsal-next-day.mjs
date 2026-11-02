// Rehearsals only: moves today's visits at a test venue back one day, so the next tap counts as a new
// day and earns a stamp (one stamp per card per day). Refuses real venues: the slug must start with
// "fairway-sim-club" and the venue can have at most 10 customers.
//   node --env-file=.env.local scripts/rehearsal-next-day.mjs fairway-sim-club
import postgres from "postgres";

const slug = process.argv[2] ?? "";
if (!slug.startsWith("fairway-sim-club")) {
  console.error("Only for the Fairway Sim Club rehearsal venue.");
  process.exit(1);
}
const sql = postgres(process.env.SUPABASE_DB_URL, { max: 1 });
try {
  const [venue] = await sql`select id, timezone, (select count(*)::int from customers c where c.venue_id = v.id) as customers from venues v where slug = ${slug}`;
  if (!venue) throw new Error(`No venue at ${slug}`);
  if (venue.customers > 10) throw new Error("That venue has real-looking traffic; not touching it.");
  const moved = await sql`
    update visits set visited_at = visited_at - interval '1 day'
    where venue_id = ${venue.id}
      and (visited_at at time zone ${venue.timezone})::date = (now() at time zone ${venue.timezone})::date
    returning id`;
  // Redemptions and resets from today move too, so a redeemed card stays at 0.
  await sql`update rewards_redeemed set redeemed_at = redeemed_at - interval '1 day'
    where venue_id = ${venue.id} and (redeemed_at at time zone ${venue.timezone})::date = (now() at time zone ${venue.timezone})::date`;
  await sql`update customers set card_reset_at = card_reset_at - interval '1 day'
    where venue_id = ${venue.id} and (card_reset_at at time zone ${venue.timezone})::date = (now() at time zone ${venue.timezone})::date`;
  console.log(`Moved ${moved.length} of today's visits to yesterday. The next tap earns a stamp.`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
