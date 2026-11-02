import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardStatus } from "@/app/dashboard/scan/actions";
import { CARD_EVENT_COLUMNS, type CardEvent } from "./activity";
import type { Venue } from "./auth";
import type { CustomerInsight } from "./labels";
import { createAdminClient } from "./supabase/admin";

// Everything the customer profile shows. Takes the Supabase client (the signed-in user's on the page).

export type ProfileData = {
  card: CardStatus;
  insight: CustomerInsight;
  events: CardEvent[];
  offers: { at: string; message: string }[];
  visits: string[]; // visited_at, newest first
  rewardsRedeemed: number;
  wallet: { apple: boolean; google: boolean; serial: string };
  email: string | null;
};

export async function loadProfile(client: SupabaseClient, venue: Venue, id: string) {
  const [{ data: card }, { data: insight }, { data: events }, { data: offers }, { data: visits }, { count: rewards }, { data: wallet }] = await Promise.all([
    client.rpc("card_status", { p_customer: id }),
    client.from("customer_insights").select("*").eq("id", id).eq("venue_id", venue.id).maybeSingle(),
    client.from("card_events").select(CARD_EVENT_COLUMNS).eq("customer_id", id).eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(200),
    client
      .from("offer_recipients")
      .select("offer_sends!inner(created_at, message)")
      .eq("customer_id", id)
      .eq("status", "delivered")
      .order("created_at", { referencedTable: "offer_sends", ascending: false })
      .limit(20),
    client.from("visits").select("visited_at").eq("customer_id", id).eq("venue_id", venue.id).order("visited_at", { ascending: false }).limit(1000),
    client.from("rewards_redeemed").select("id", { count: "exact", head: true }).eq("customer_id", id).eq("kind", "main"),
    client.from("customers").select("pass_serial, wallet_platforms").eq("id", id).eq("venue_id", venue.id).maybeSingle(),
  ]);
  if (!card || !insight || !wallet) return null;
  const serial = wallet.pass_serial as string;
  return {
    card: card as CardStatus,
    insight: insight as CustomerInsight,
    events: (events ?? []) as unknown as CardEvent[],
    offers: ((offers ?? []) as unknown as { offer_sends: { created_at: string; message: string } }[]).map((o) => ({
      at: o.offer_sends.created_at,
      message: o.offer_sends.message,
    })),
    visits: (visits ?? []).map((v) => v.visited_at as string),
    rewardsRedeemed: rewards ?? 0,
    wallet: { apple: (await appleDevices(serial)) > 0, google: ((wallet.wallet_platforms as string[]) ?? []).includes("google"), serial },
    email: null, // customers join with a phone number; no email on file yet
  } satisfies ProfileData;
}

/** Apple device registrations are server-only; this counts just one customer's own pass. */
async function appleDevices(serial: string) {
  const { count } = await createAdminClient().from("apple_registrations").select("serial_number", { count: "exact", head: true }).eq("serial_number", serial);
  return count ?? 0;
}

/** Visits per month for the last 12 months (oldest first), as YYYY-MM in the venue's time zone. */
export function visitsPerMonth(visits: string[], timeZone: string, now = Date.now()) {
  const ym = (d: Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone }).format(d).slice(0, 7);
  const months: string[] = [];
  const base = new Date(now);
  for (let i = 11; i >= 0; i--) months.push(ym(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 15))));
  const counts = new Map<string, number>();
  for (const v of visits) counts.set(ym(new Date(v)), (counts.get(ym(new Date(v))) ?? 0) + 1);
  return months.map((m) => ({ month: m, n: counts.get(m) ?? 0 }));
}
